import os
import json
import time
import cv2
import numpy as np
import traceback
import queue
import threading
import datetime
from collections import deque
from ultralytics import YOLO
import torch
import requests
from pyzbar.pyzbar import decode # Enhanced QR Detection

from .shared import DetectionPayload, QREvent, ControlEvent, PROC_DETECTOR, PROC_SCANNER
from .config import load_config
from .uploader import UploaderThread

# === CONSTANTS & CONFIG (COPIED FROM V2) ===
MIN_PERSISTENCE = 3
INDIVIDUAL_COOLDOWN = 2.0
GLOBAL_COOLDOWN = 0.5
MIN_CROSSING_DISTANCE = 30
MIN_CROSSING_TIME = 1.5
POSITION_HISTORY_TTL = 5.0
SHEET_TIMER_DURATION = 600 # 10 minutes

from pathlib import Path

# Get project root (3 levels up from src/detection/gui_version_partial/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
STATE_FILE = str(PROJECT_ROOT / "config" / "v3_state.json")

def save_state(state):
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f)
        # print("State saved:", state) 
    except Exception as e:
        print(f"Error saving state: {e}")

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

# === THREADED CAMERA ===
# === THREADED CAMERA (REALTIME OPTIMIZED) ===
class ThreadedCamera:
    def __init__(self, src):
        self.src = src
        self.cap = self._open_rtsp_low_latency()
        
        if self.cap and self.cap.isOpened():
            self.w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.grabbed, self.frame = self.cap.read()
        else:
            self.w = 640
            self.h = 480
            self.grabbed = False
            self.frame = None
            
        self.started = False
        self.read_lock = threading.Lock()
    
    def _open_rtsp_low_latency(self):
        # Only apply optimization if source is RTSP/HTTP URL (string)
        if isinstance(self.src, int) or (isinstance(self.src, str) and self.src.isdigit()):
             print(f"Opening Webcam {self.src}")
             cap = cv2.VideoCapture(int(self.src))
             cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
             return cap

        print(f"Opening RTSP Low Latency: {self.src}")
        # FFmpeg Low Latency Flags
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
            "rtsp_transport;tcp|" 
            "fflags;nobuffer|" 
            "max_delay;500000|"  # 0.5s max delay
            "flags;low_delay"
        )
        cap = cv2.VideoCapture(self.src, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) # Force small OS buffer
        return cap
        
    def start(self):
        if self.started: return self
        self.started = True
        self.thread = threading.Thread(target=self.update, args=(), daemon=True)
        self.thread.start()
        return self
        
    def update(self):
        while self.started:
            if self.cap is None or not self.cap.isOpened():
                # Try reconnect
                print("Camera disconnected, reconnecting...")
                if self.cap: self.cap.release()
                self.cap = self._open_rtsp_low_latency()
                if not self.cap or not self.cap.isOpened():
                    time.sleep(2)
                    continue
                    
            grabbed, frame = self.cap.read()
            if grabbed:
                with self.read_lock:
                    self.grabbed = grabbed
                    self.frame = frame
            else:
                print("Frame drop / connection lost")
                self.cap.release()
                
            # No sleep here! We want to read as fast as possible to purge buffer.
            # The 'leaky bucket' is self.frame being overwritten.
            
    def read(self):
        with self.read_lock:
            if not self.grabbed:
                return False, None
            return True, self.frame.copy()
            
    def stop(self):
        self.started = False
        if hasattr(self, 'thread') and self.thread.is_alive():
            self.thread.join()
        if self.cap and self.cap.isOpened():
            self.cap.release()

# === QR WORKER ===
# === QR WORKER ===
class QRWorker(threading.Thread):
    def __init__(self, result_callback):
        super().__init__(daemon=True)
        self.result_callback = result_callback
        self.latest_frame = None
        self.lock = threading.Lock()
        self.running = True
        # self.detector = cv2.QRCodeDetector() # REMOVED: Weak detection
        self.last_scan = 0
        self.qr_cooldowns = {} # Stores timestamp of last scan per QR content
    
    def update_frame(self, frame):
        with self.lock:
            # Optimize: Only scan center crop or resized
            if len(frame.shape) == 3:
                self.latest_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            else:
                self.latest_frame = frame.copy()

    def run(self):
        print(f"[{PROC_DETECTOR}] QR Worker started using pyzbar (High Performance)")
        while self.running:
            try:
                frame_to_scan = None
                with self.lock:
                    if self.latest_frame is not None:
                        frame_to_scan = self.latest_frame
                        self.latest_frame = None
                
                if frame_to_scan is not None:
                    # Using pyzbar for robust detection
                    decoded_objects = decode(frame_to_scan)
                    if decoded_objects:
                        for obj in decoded_objects:
                            data = obj.data.decode("utf-8")
                            data = data.strip()
                            
                            # FILTER: Strict Plate Detection
                            # 1. Must contain SPACE (e.g., "KT 1234 ABC")
                            # 2. OR be very long (longer than typical barcode/garbage)
                            if " " not in data and len(data) < 9:
                                print(f"[{PROC_DETECTOR}] 🛑 REJECTED BARCODE/NOISE: '{data}' (No space/Short)")
                                continue
                            
                            now = time.time()
                            
                            # Check per-QR cooldown (1 minute)
                            last_time_for_this_qr = self.qr_cooldowns.get(data, 0)
                            if now - last_time_for_this_qr < 60.0:
                                # Too soon for THIS specific QR
                                continue
                                
                            # Check global cooldown (2 seconds - to prevent rapid firing different QRs)
                            if now - self.last_scan > 2.0:
                                 self.result_callback(data)
                                 self.last_scan = now
                                 self.qr_cooldowns[data] = now
                                 
                                 # Cleanup old cooldowns to save memory
                                 # Remove entries older than 2 minutes
                                 for k in list(self.qr_cooldowns.keys()):
                                     if now - self.qr_cooldowns[k] > 120:
                                         del self.qr_cooldowns[k]
                                         
                            break # Take first Valid QR
                                
                time.sleep(0.1)
            except Exception as e:
                print(f"[{PROC_DETECTOR}] QR Loop Error: {e}")
                time.sleep(1)

# === STATE POLLER WORKER (FIX FPS FREEZE) ===
class StatePoller(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self.latest_data = None
        self.running = True

    def run(self):
        while self.running:
            try:
                # Synchronous request here, but in background thread -> No FPS freeze
                resp = requests.get("http://localhost:5001/api/state", timeout=1.0)
                if resp.status_code == 200:
                    self.latest_data = resp.json()
            except Exception:
                pass 
            time.sleep(1.0) # Poll every 1 second

# === MAIN LOGIC RUNNER ===
def run_detector_threaded(config, callback_update=None):
    print(f"[{PROC_DETECTOR}] Starting V3 (Replica V2 Mode)...")
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    # 1. Setup Logic Variables
    
    # Default State
    state = {
        "detection_mode": "vertical",
        "line_x_prop": 0.5,
        "line_y_prop": 0.5,
        "mid_gap_prop": 0.15,
        "roi_x_prop": 0.2,
        "roi_y_prop": 0.2,
        "roi_width_prop": 0.6,
        "roi_height_prop": 0.6
    }
    
    # Load Saved State
    saved = load_state()
    state.update(saved)
    
    # Apply State
    detection_mode = state["detection_mode"]
    line_x_prop = state["line_x_prop"]
    line_y_prop = state["line_y_prop"]
    mid_gap_prop = state["mid_gap_prop"]
    roi_x_prop = state["roi_x_prop"]
    roi_y_prop = state["roi_y_prop"]
    roi_width_prop = state["roi_width_prop"]
    roi_height_prop = state["roi_height_prop"]
    
    current_conf = config.conf
    current_iou = config.iou
    debug_low_thresh = False
    
    loading = 0
    rehab = 0
    total = 0
    
    track_history = {}
    track_band_state = {}
    track_last_seen = {}
    blacklisted_ids = {} # For cooldown
    armed_objects = {}   # {track_id: {"time": float, "pos": (x,y), "status": "ARMED"|"FINISHED"}}
    persistence_queue = {} # {track_id: timestamp_to_count}
    previous_positions = {} # {track_id: (cx, cy)} - NEW for simple crossing
    last_crossing_positions = {}
    last_count_time = 0
    
    # Control Flags
    counting_active = False
    
    # Animations
    loading_anim = False
    rehab_anim = False
    anim_start_time = 0
    anim_duration = 1.0
    
    sheet_timer_start = None
    
    # 2. Communication
    upload_queue = queue.Queue()
    uploader = UploaderThread(config, upload_queue)
    uploader.start()
    
    # 3. Model Optimization (Parity with V2)
    is_tensorrt = config.model.lower().endswith('.engine')
    if is_tensorrt:
        print(f"[{PROC_DETECTOR}] TensorRT engine detected. Using CUDA.")
        device = 'cuda'
    else:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"[{PROC_DETECTOR}] Using device: {device}")
        
    try:
        model = YOLO(config.model)
        if not is_tensorrt:
            model.to(device)
            if device == 'cuda':
                torch.backends.cudnn.benchmark = True
                if config.half: # Ensure config allows half
                    print(f"[{PROC_DETECTOR}] Converting to half precision...")
                    model.half()
        else:
            print(f"[{PROC_DETECTOR}] TensorRT optimized inference active.")
    except Exception as e:
        print(f"[{PROC_DETECTOR}] Model failed load: {e}")
        model = None 

    # 4. Camera
    source = config.source
    if str(source).isdigit():
        source = int(source)
        
    cap = ThreadedCamera(source).start()
    time.sleep(1) # Warmup
    
    # 5. QR & API Control
    current_plate = "UNKNOWN" # Force startup as UNKNOWN per user request
    
    # --- FORCE RESET API STATE ON STARTUP (User Request) ---
    try:
        print(f"[{PROC_DETECTOR}] Sending Force RESET to API Server...")
        reset_payload = {"plate": "UNKNOWN", "status": "WAITING", "source": "detector_startup"}
        requests.post("http://localhost:5001/api/telegram_update", json=reset_payload, timeout=2)
    except Exception as e:
        print(f"[{PROC_DETECTOR}] Warning: Could not reset API state on startup: {e}")

    api_sync_pause_until = 0 # Grace period timer

    def sync_with_api(data, api_status="READY"):
        nonlocal current_plate, loading, rehab, total, sheet_timer_start, counting_active
        
        # A. Status Handling
        if api_status in ["START", "LOADING"]:
            counting_active = True
            if sheet_timer_start is None:
                sheet_timer_start = time.time()
                print(f"[{PROC_DETECTOR}] START status detected. Timer & Counting STARTED.")
                upload_queue.put(DetectionPayload(time.time(), current_plate, loading, rehab, total, "SESSION_START"))
        elif api_status in ["STOP", "STOPPED", "IDLE", "FINISHED"]:
            counting_active = False
            # If stopped, finalize session with LAST ACTIVITY TIME
            if sheet_timer_start is not None:
                print(f"[{PROC_DETECTOR}] STOP command. Finalizing session with Last Activity: {sheet_timer_start}")
                ts = sheet_timer_start
                upload_queue.put(DetectionPayload(ts, current_plate, loading, rehab, total, "SESSION_END"))
                sheet_timer_start = None
                
        # B. Plate Handling
        if data == current_plate: return # Same plate, skip
        
        print(f"*** NEW PLATE: {data} (Old: {current_plate}) [Status: {api_status}] ***")
        
        # 1. Finalize OLD session if it exists AND VALID (active timer)
        # If we already finalized via STOP above (sheet_timer_start is None), we skip this.
        if sheet_timer_start is not None:
             ts = sheet_timer_start
             upload_queue.put(DetectionPayload(ts, current_plate, loading, rehab, total, "SESSION_END"))
        
        # 2. Start NEW session (RESET)
        current_plate = data
        loading = rehab = total = 0
        blacklisted_ids.clear()
        armed_objects.clear()
        persistence_queue.clear()
        
        # Reset timer based on current status (which was updated in A)
        if counting_active:
            sheet_timer_start = time.time() 
        else:
            sheet_timer_start = None
        
        upload_queue.put(DetectionPayload(time.time(), current_plate, 0, 0, 0, "QR_START"))

    def on_qr(data):
        nonlocal api_sync_pause_until
        # Set grace period: Ignore API polling for 5 seconds to prevent race condition
        # (where API still thinks "UNKNOWN" because it hasn't received our update yet)
        api_sync_pause_until = time.time() + 5.0 
        
        # --- FIX: PUSH STATE TO API SERVER ---
        # We must tell the API server about the new plate, otherwise
        # the next poll (after 5s) will overwrite us with "UNKNOWN"
        try:
             # Use a separate thread or non-blocking call if possible, 
             # but a quick timeout=1 is okay here for simplicity.
             payload = {"plate": data, "status": "START", "source": "detector_qr"}
             # Run in background to not block QR thread? 
             # QR thread is already a thread, so blocking it slightly is fine 
             # as long as it doesn't freeze the main loop (it won't).
             requests.post("http://localhost:5001/api/telegram_update", json=payload, timeout=1)
             print(f"[{PROC_DETECTOR}] Sync QR -> API Success: {data}")
        except Exception as e:
             print(f"[{PROC_DETECTOR}] Sync QR -> API Failed: {e}")

        sync_with_api(data, "START") # QR auto-starts
    
    qr_thread = QRWorker(on_qr)
    qr_thread.start()
    
    # 6. FPS Setup
    prev_time = time.time()
    
    # Start Poller
    poller = StatePoller()
    poller.start()
    
    fps = 0
    frame_count = 0
    
    w, h = cap.w, cap.h
    if w == 0: w, h = 640, 480 # Fallback
    
    version_str = "V4 (Persistence)" if getattr(config, 'v4', False) else "V3 (Modular)"
    window_name = f"Monitor {version_str}"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, config.width, config.height)
    print(f"[{PROC_DETECTOR}] Window created: {config.width}x{config.height}")
    
    box_x = 10 
    
    try:
        while True:
            # A. Read Frame
            ret, frame = cap.read()
            
            if not ret or frame is None:
                # If no frame, create black frame with "Internal Error / Connecting"
                frame = np.zeros((h, w, 3), dtype=np.uint8)
                cv2.putText(frame, "CONNECTING CAMERA...", (50, h//2), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                cv2.imshow(window_name, frame)
                if cv2.waitKey(100) & 0xFF == ord('q'):
                    break
                continue
            
            frame_count += 1
            
            # API Polling (Non-Blocking Check)
            if frame_count % 30 == 0:
                # Check Grace Period
                if time.time() < api_sync_pause_until:
                    # Skip polling to protect local QR state
                    pass
                else:
                    # Read from background poller
                    api_data = poller.latest_data
                    if api_data:
                        api_plate = api_data.get("plate", "UNKNOWN")
                        api_status = api_data.get("status", "IDLE")
                        
                        if api_plate and api_plate != "UNKNOWN":
                            sync_with_api(api_plate, api_status)
                        elif api_status == "WAITING":
                            sync_with_api("UNKNOWN", "WAITING")
            
            # QR Update
            if frame_count % 5 == 0:
                qr_thread.update_frame(frame)
                
            # B. Definitions (ROI, Lines)
            #roi_x_prop = max(0.0, min(1.0, roi_x_prop))
            #roi_y_prop = max(0.0, min(1.0, roi_y_prop))
            #roi_width_prop = max(0.05, min(1.0 - roi_x_prop, roi_width_prop))
            #roi_height_prop = max(0.05, min(1.0 - roi_y_prop, roi_height_prop))

            display_w, display_h = w, h 
            
            # ROI
            detect_x_start = int(roi_x_prop * w)
            detect_y_start = int(roi_y_prop * h)
            detect_x_end = int((roi_x_prop + roi_width_prop) * w)
            detect_y_end = int((roi_y_prop + roi_height_prop) * h)
            
            # Create ROI View
            roi_frame = frame[detect_y_start:detect_y_end, detect_x_start:detect_x_end]
            if roi_frame.size == 0: continue
            
            # C. Inference
            # Use current_conf/current_iou variables for adjustment
            if model is not None:
                # Optimized inference call matching V2
                results = model.track(
                    roi_frame, 
                    persist=True, 
                    imgsz=config.imgsz, 
                    conf=current_conf, 
                    iou=current_iou, 
                    device=device,
                    half=config.half if device == 'cuda' and not is_tensorrt else False,
                    max_det=20,
                    verbose=False
                )
                
                # D. Count Logic
                crossing_now = False
                
                # Define Bands (Global Coords)
                roi_w = detect_x_end - detect_x_start
                roi_h = detect_y_end - detect_y_start
                
                if detection_mode == "horizontal":
                    line_pos = int(line_y_prop * h)
                    band_gap = int(mid_gap_prop * h)
                    band1 = line_pos - band_gap
                    band2 = line_pos + band_gap
                else:
                    line_pos = int(line_x_prop * w)
                    band_gap = int(mid_gap_prop * w)
                    band1 = line_pos - band_gap
                    band2 = line_pos + band_gap

                # Enable detection ALWAYS (Visualization + Unknown Mode)
                if True: # counting_active check removed to allow UNKNOWN detection
                    if results[0].boxes.id is not None:
                        boxes = results[0].boxes.xyxy.cpu().numpy()
                        ids = results[0].boxes.id.cpu().numpy()
                        
                        for box, track_id in zip(boxes, ids):
                            track_id = int(track_id)
                            
                            # Convert ROI coords to Global
                            x1, y1, x2, y2 = box
                            x1 += detect_x_start
                            x2 += detect_x_start
                            y1 += detect_y_start
                            y2 += detect_y_start
                            
                            cx = int((x1 + x2) / 2)
                            cy = int((y1 + y2) / 2)
                            
                            # Draw Box (Global) - Color codes
                            b_col = (0, 255, 0) # Default Green
                            if track_id in armed_objects:
                                status = armed_objects[track_id]["status"]
                                if status.startswith("ARMED"):
                                    b_col = (0, 255, 255) # Yellow for Armed
                                elif status == "FINISHED":
                                    b_col = (255, 255, 0) # Cyan/Blue for Finished
                                    
                            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), b_col, 2)
                            cv2.putText(frame, f"ID:{track_id}", (int(x1), int(y1)-5), font, 0.5, b_col, 2)
                            
                            # --- V4 PERSISTENCE LOGIC (DISABLED/BYPASSED) ---
                            # We are using the simpler logic above for all modes now as per user request
                            if False and getattr(config, 'v4', False):
                                # 1. Define Regions (Direction Aware)
                                # Horizontal: B2T (Loading), T2B (Rehab)
                                # Vertical: R2L (Loading), L2R (Rehab)
                                
                                is_at_loading_entry = False
                                is_at_loading_target = False
                                is_at_rehab_entry = False
                                is_at_rehab_target = False
                                
                                if detection_mode == "horizontal":
                                    if cy > band2: is_at_loading_entry = True; is_at_rehab_target = True
                                    elif cy < band1: is_at_loading_target = True; is_at_rehab_entry = True
                                else:
                                    # R2L is Loading, so Entry is Right (band2), Target is Left (band1)
                                    # L2R is Rehab, so Entry is Left (band1), Target is Right (band2)
                                    if cx > band2: is_at_loading_entry = True; is_at_rehab_target = True
                                    elif cx < band1: is_at_loading_target = True; is_at_rehab_entry = True

                                # 2. State Machine
                                if track_id not in blacklisted_ids:
                                    # Check Loading Path
                                    if is_at_loading_entry:
                                        armed_objects[track_id] = {"time": time.time(), "pos": (cx, cy), "status": "ARMED_LOADING"}
                                        if track_id in persistence_queue: del persistence_queue[track_id]
                                    
                                    elif is_at_loading_target and track_id in armed_objects:
                                        if armed_objects[track_id]["status"] == "ARMED_LOADING":
                                            armed_objects[track_id]["status"] = "FINISHED"
                                            loading += 1
                                            total = loading - rehab
                                            loading_anim = True
                                            anim_start_time = time.time()
                                            sheet_timer_start = time.time()
                                            blacklisted_ids[track_id] = time.time() + INDIVIDUAL_COOLDOWN
                                            upload_queue.put(DetectionPayload(time.time(), current_plate, loading, rehab, total, "AUTO"))
                                    
                                    # Check Rehab Path
                                    if track_id not in blacklisted_ids:
                                        if is_at_rehab_entry:
                                            armed_objects[track_id] = {"time": time.time(), "pos": (cx, cy), "status": "ARMED_REHAB"}
                                            if track_id in persistence_queue: del persistence_queue[track_id]
                                        
                                        elif is_at_rehab_target and track_id in armed_objects:
                                            if armed_objects[track_id]["status"] == "ARMED_REHAB":
                                                armed_objects[track_id]["status"] = "FINISHED"
                                                rehab += 1
                                                total = loading - rehab
                                                rehab_anim = True
                                                anim_start_time = time.time()
                                                sheet_timer_start = time.time()
                                                blacklisted_ids[track_id] = time.time() + INDIVIDUAL_COOLDOWN
                                                upload_queue.put(DetectionPayload(time.time(), current_plate, loading, rehab, total, "AUTO"))

                                # Fast Entry (Fallback)
                                if track_id not in blacklisted_ids and track_id not in armed_objects:
                                     if is_at_loading_target:
                                         # Appeared directly in truck
                                         armed_objects[track_id] = {"time": time.time(), "pos": (cx, cy), "status": "FINISHED"}
                                         loading += 1
                                         total = loading - rehab
                                         loading_anim = True
                                         anim_start_time = time.time()
                                         sheet_timer_start = time.time()
                                         blacklisted_ids[track_id] = time.time() + INDIVIDUAL_COOLDOWN
                                         upload_queue.put(DetectionPayload(time.time(), current_plate, loading, rehab, total, "AUTO"))

                                # Update last seen info
                                if track_id in armed_objects and armed_objects[track_id]["status"].startswith("ARMED"):
                                    armed_objects[track_id]["time"] = time.time()
                                    armed_objects[track_id]["pos"] = (cx, cy)
                            
                            
                            # --- SIMPLIFIED CROSSING LOGIC (USER REQUEST) ---
                            # Replaces complex band logic for easier detection near the line
                            
                            if track_id in previous_positions:
                                prev_cx, prev_cy = previous_positions[track_id]
                                
                                direction = None
                                
                                if detection_mode == "horizontal":
                                    # Horizontal Line (Top/Bottom)
                                    # B2T (Bottom to Top) = Loading (y decreasing)
                                    # T2B (Top to Bottom) = Rehab (y increasing)
                                    line_y = int(line_y_prop * h)
                                    
                                    # Check Crossing
                                    if prev_cy > line_y and cy <= line_y:
                                        direction = 'B2T' # Loading
                                    elif prev_cy < line_y and cy >= line_y:
                                        direction = 'T2B' # Rehab
                                        
                                else:
                                    # Vertical Line (Left/Right)
                                    # R2L (Right to Left) = Loading (x decreasing)
                                    # L2R (Left to Right) = Rehab (x increasing)
                                    line_x = int(line_x_prop * w)
                                    
                                    # Check Crossing
                                    if prev_cx > line_x and cx <= line_x:
                                        direction = 'R2L' # Loading
                                    elif prev_cx < line_x and cx >= line_x:
                                        direction = 'L2R' # Rehab

                                if direction:
                                    now = time.time()
                                    if now >= blacklisted_ids.get(track_id, 0):
                                        print(f"Crossing detected: {direction} ID:{track_id}")
                                        
                                        if direction in ['R2L', 'B2T']: # LOADING
                                            loading += 1
                                            loading_anim = True
                                        else: # REHAB
                                            rehab += 1
                                            rehab_anim = True
                                            
                                        total = loading - rehab
                                        anim_start_time = now
                                        sheet_timer_start = now
                                        blacklisted_ids[track_id] = now + 3.0 # 3s cooldown to prevent double count
                                        upload_queue.put(DetectionPayload(now, current_plate, loading, rehab, total, "AUTO"))

                            # Update Previous Position
                            previous_positions[track_id] = (cx, cy)
                            
                            # Clean up old V3/V4 logic variables to prevent confusion/errors
                            # (We keep the drawing logic for existing track_band_state if needed, 
                            # but core counting is now above)
                            pass
                else:
                    # If counting not active, clear drawings or show nothing?
                    pass

                # --- V4 ASYNC PERSISTENCE CHECK (FOR OCCLUSION) ---
                if counting_active and getattr(config, 'v4', False):
                    now = time.time()
                    current_ids = ids if (results[0].boxes.id is not None) else []
                    
                    for tid, data in list(armed_objects.items()):
                        if data["status"].startswith("ARMED"):
                            if tid not in current_ids:
                                # Object is missing. Check if it was last seen in its respective target zone.
                                lx, ly = data["pos"]
                                status = data["status"]
                                triggering_persistence = False
                                
                                if status == "ARMED_LOADING":
                                    if detection_mode == "horizontal":
                                        if ly < band1: triggering_persistence = True
                                    else:
                                        if lx < band1: triggering_persistence = True # R2L Target
                                        
                                elif status == "ARMED_REHAB":
                                    if detection_mode == "horizontal":
                                        if ly > band2: triggering_persistence = True
                                    else:
                                        if lx > band2: triggering_persistence = True # L2R Target
                                        
                                if triggering_persistence:
                                    if tid not in persistence_queue:
                                        persistence_queue[tid] = {"timeout": now + 3.0, "type": ("loading" if status == "ARMED_LOADING" else "rehab")}
                                        print(f"[{PROC_DETECTOR}] ID:{tid} missing in {status} TARGET. Starting 3s persistence...")
                                else:
                                    # If missing in ENTRY zone, just remove it after 2s (maybe walked away)
                                    if (now - data["time"]) > 2.0:
                                        del armed_objects[tid]
                                        if tid in persistence_queue: del persistence_queue[tid]

                    # Process persistence queue triggers
                    for tid, pdata in list(persistence_queue.items()):
                        if now >= pdata["timeout"]:
                            p_type = pdata["type"]
                            print(f"[{PROC_DETECTOR}] PERSISTENCE TRIGGER: ID:{tid} counted as {p_type} after 3s occlusion.")
                            
                            if p_type == "loading":
                                loading += 1
                                loading_anim = True
                            else:
                                rehab += 1
                                rehab_anim = True
                                
                            total = loading - rehab
                            anim_start_time = now
                            sheet_timer_start = now
                            blacklisted_ids[tid] = now + INDIVIDUAL_COOLDOWN
                            if tid in armed_objects: del armed_objects[tid]
                            del persistence_queue[tid]
                            upload_queue.put(DetectionPayload(now, current_plate, loading, rehab, total, "AUTO"))


                    # Cleanup previous_positions for IDs that are no longer tracked
                    # Cleanup previous_positions (Grace Period for Flicker/Occlusion)
                    # FIX: Don't delete immediately if missing. Wait 2 seconds.
                    if results[0].boxes.id is not None:
                         current_track_ids = set(results[0].boxes.id.cpu().numpy().astype(int))
                         now = time.time()
                         
                         # Update last_seen for current IDs
                         for tid in current_track_ids:
                             track_last_seen[tid] = now
                             
                         # Remove OLD IDs that haven't been seen for > 2 seconds
                         keys_to_remove = [k for k in previous_positions if (now - track_last_seen.get(k, 0) > 2.0)]
                         for k in keys_to_remove:
                             if k in previous_positions: del previous_positions[k]
                             if k in track_last_seen: del track_last_seen[k]

            else:
                 cv2.putText(frame, "MODEL ERROR: Check Path", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

            # E. DRAWING UI (EXACTLY V2)
            font = cv2.FONT_HERSHEY_SIMPLEX
            
            # 1. Counter Box (Top Left)
            box_items = [("Loading", loading, (0, 255, 0)), ("Rehab", rehab, (0, 0, 255)), ("Total", total, (255, 0, 0))]
            # Draw bg
            cv2.rectangle(frame, (10, 10), (220, 130), (255, 255, 255), -1)
            cv2.rectangle(frame, (10, 10), (220, 130), (0, 0, 0), 3)
            
            cy_txt = 40
            for lbl, val, col in box_items:
                cv2.putText(frame, f"{lbl}", (20, cy_txt), font, 0.7, col, 2)
                cv2.putText(frame, ":", (120, cy_txt), font, 0.7, col, 2)
                cv2.putText(frame, str(val), (140, cy_txt), font, 0.7, col, 2)
                cy_txt += 30
                
            # 2. FPS (Top Right)
            fps_text = f"FPS: {fps:.1f}"
            (fw, fh), _ = cv2.getTextSize(fps_text, font, 0.9, 2)
            fx = w - fw - 20
            fy = 40
            cv2.rectangle(frame, (fx-5, fy-fh-5), (fx+fw+5, fy+5), (0,0,0), -1)
            cv2.putText(frame, fps_text, (fx, fy), font, 0.9, (255,255,255), 2)
            
            # 3. Plate (Below FPS)
            p_text = current_plate
            (pw, ph), _ = cv2.getTextSize(p_text, font, 0.9, 2)
            px = w - pw - 20
            py = fy + 50
            # Bg White, Border Black
            cv2.rectangle(frame, (px-5, py-ph-5), (px+pw+5, py+5), (255,255,255), -1)
            cv2.rectangle(frame, (px-5, py-ph-5), (px+pw+5, py+5), (0,0,0), 2)
            cv2.putText(frame, p_text, (px, py), font, 0.9, (0,0,0), 2)
            
            # 4. Timer / QR Status (Modified Position)
            # FIX: Only show "Waiting" if NO timer is active. 
            # If timer is active (due to activity), show timer even if plate is UNKNOWN.
            if current_plate == "UNKNOWN" and sheet_timer_start is None:
                # Anim "MENUNGGU QR..."
                msg = "MENUNGGU QR..."
                idx = int(time.time() * 4) % (len(msg) + 5)
                show_msg = msg[:min(len(msg), idx)]
                
                # Move to Left Side (x=10, y=220)
                mx, my = 10, 220
                (mw, mh), _ = cv2.getTextSize(msg, font, 0.9, 2)
                
                # Background
                cv2.rectangle(frame, (mx, my-mh-10), (mx+mw+20, my+10), (255,255,255), -1)
                cv2.rectangle(frame, (mx, my-mh-10), (mx+mw+20, my+10), (0,0,0), 2)
                cv2.putText(frame, show_msg, (mx+10, my), font, 0.9, (0, 165, 255), 2)
                
            elif sheet_timer_start:
                # Timer - Also move to Left Side for consistency
                elapsed = time.time() - sheet_timer_start
                rem = max(0, 600 - elapsed) # 600s = 10 mins
                mins, secs = divmod(int(rem), 60)
                t_txt = f"TIMER: {mins:02d}:{secs:02d}"
                
                mx, my = 10, 220
                (tw, th), _ = cv2.getTextSize(t_txt, font, 0.9, 2)
                cv2.rectangle(frame, (mx, my-th-10), (mx+tw+20, my+10), (255,255,255), -1)
                cv2.rectangle(frame, (mx, my-th-10), (mx+tw+20, my+10), (0,0,0), 2)
                col = (0,0,255) if rem < 60 else (0, 165, 255)
                cv2.putText(frame, t_txt, (mx+10, my), font, 0.9, col, 2)

                # CHECK EXPIRATION
                if elapsed >= 600:
                   print("⏳ Timer 10 menit habis. Reset ke UNKNOWN.")
                   # Use last activity time for Jam Selesai
                   ts = sheet_timer_start if sheet_timer_start else time.time()
                   upload_queue.put(DetectionPayload(ts, current_plate, loading, rehab, total, "SESSION_END"))
                   
                   # Reset semua variabel penghitungan
                   loading = rehab = total = 0
                   blacklisted_ids.clear()
                   track_band_state.clear()
                   armed_objects.clear()
                   persistence_queue.clear()
                   
                   # Matikan timer dan set ke UNKNOWN
                   sheet_timer_start = None
                   current_plate = "UNKNOWN"
                   
                   # --- SYNC TO API SERVER (Reset Bot Dashboard) ---
                   try:
                       # 1. Reset API State (So TUI and Web Dashboard update)
                       payload = {"plate": "UNKNOWN", "status": "WAITING", "source": "detector_timeout"}
                       requests.post("http://localhost:5001/api/telegram_update", json=payload, timeout=1)
                       
                       # 2. Reset Telegram Bot UI (Push Notification & Menu)
                       requests.post("http://localhost:8000/bot/reset", json={}, timeout=1)
                       
                       print("✅ API & Bot State reset to WAITING (Timeout)")
                   except Exception as e:
                       print(f"⚠️ Failed to reset API/Bot state: {e}")
            
            # 5. Lines & ROI
            # Unified Visualization (Single Line Mode)
            if detection_mode == "horizontal":
                # SINGLE Horizontal Line
                cv2.line(frame, (0, line_pos), (w, line_pos), (0, 255, 0), 2) # Green Line
                cv2.putText(frame, "DETECTION LINE", (10, line_pos - 10), font, 0.6, (0, 255, 0), 2)
            else:
                # SINGLE Vertical Line
                cv2.line(frame, (line_pos, 0), (line_pos, h), (0, 255, 0), 2) # Green Line
                cv2.putText(frame, "DETECTION LINE", (line_pos + 10, 30), font, 0.6, (0, 255, 0), 2)

            # Draw ROI box
            cv2.rectangle(frame, (detect_x_start, detect_y_start), (detect_x_end, detect_y_end), (255, 255, 0), 2)
            
            # 6. Animation popups
            if loading_anim and (time.time() - anim_start_time < anim_duration):
                if int(time.time()*10)%2 == 0:
                    cv2.putText(frame, "+1", (box_x, 60), font, 1.0, (0,255,0), 3)
            elif rehab_anim and (time.time() - anim_start_time < anim_duration):
                 if int(time.time()*10)%2 == 0:
                    cv2.putText(frame, "+1", (box_x, 90), font, 1.0, (0,0,255), 3)
            else:
                loading_anim = False
                rehab_anim = False

            # 7. Debug
            if detection_mode == "horizontal":
                pos_text = f"line_y: {line_y_prop:.2f}"
            else:
                pos_text = f"line_x: {line_x_prop:.2f}"
            
            cv2.putText(frame, f"{pos_text} gap: {mid_gap_prop:.2f} roi_x: {roi_x_prop:.2f} w: {roi_width_prop:.2f} y: {roi_y_prop:.2f} h: {roi_height_prop:.2f}", (10, h - 20), font, 0.5, (255, 255, 0), 1)
            cv2.putText(frame, "WASD: Atur Kotak | g/G: Garis | h/H: Gap | R: Reset", (10, h - 50), font, 0.5, (255, 255, 0), 1)

            # --- ZMQ & SHARED UPDATE ---
            api_status = "RUNNING"
            
            # ZMQ
            try:
                zmq_pub.send_frame(frame)
                zmq_pub.send_stats({
                    "inbound": loading,
                    "outbound": rehab,
                    "total": total,
                    "fps": fps,
                    "plate": config.plate,
                    "status": api_status
                })
            except Exception:
                pass

            # Internal Flask Callback
            if callback_update:
                callback_update(frame, {
                    "inbound": loading,
                    "outbound": rehab,
                    "total": total,
                    "fps": fps,
                    "plate": config.plate,
                    "status": api_status
                })

            cv2.imshow(window_name, frame)
            
            # CONTROLS
            key = cv2.waitKey(1) & 0xFF
            
            # Helper to save current state
            def perform_save():
                s = {
                    "detection_mode": detection_mode,
                    "line_x_prop": line_x_prop,
                    "line_y_prop": line_y_prop,
                    "mid_gap_prop": mid_gap_prop,
                    "roi_x_prop": roi_x_prop,
                    "roi_y_prop": roi_y_prop,
                    "roi_width_prop": roi_width_prop,
                    "roi_height_prop": roi_height_prop
                }
                save_state(s)

            if key == 27: # ESC
                print("ESC pressed, exiting...")
                break
            elif key == ord('q') or key == ord('Q'):
                print("🛑 'Q' key pressed. Exiting...")
                break
            elif key == ord('g'):
                if detection_mode == "horizontal": line_y_prop = max(0.0, line_y_prop - 0.01)
                else: line_x_prop = max(0.0, line_x_prop - 0.01)
                perform_save()
            elif key == ord('G'):
                if detection_mode == "horizontal": line_y_prop = min(1.0, line_y_prop + 0.01)
                else: line_x_prop = min(1.0, line_x_prop + 0.01)
                perform_save()
            elif key == ord('h'):
                mid_gap_prop = max(0.0, mid_gap_prop - 0.01)
                perform_save()
            elif key == ord('H'):
                mid_gap_prop = min(1.0, mid_gap_prop + 0.01)
                perform_save()
            elif key == ord('J'):
                roi_x_prop = max(0.0, roi_x_prop - 0.01)
                perform_save()
            elif key == ord('L'):
                roi_x_prop = min(1.0, roi_x_prop + 0.01)
                perform_save()
            elif key == ord('I'):
                detection_mode = "horizontal" if detection_mode == "vertical" else "vertical"
                track_band_state.clear()
                perform_save()
            elif key == ord('O'):
                roi_height_prop = min(1.0, roi_height_prop + 0.01)
                perform_save()
            elif key == ord('K'):
                roi_height_prop = max(0.1, roi_height_prop - 0.01)
                perform_save()
            # WASD for ROI
            # w/W: Top Edge
            elif key == ord('w'): # Top Up -> y dec, h inc
                roi_y_prop = max(0.0, roi_y_prop - 0.01)
                roi_height_prop = min(1.0 - roi_y_prop, roi_height_prop + 0.01)
                perform_save()
            elif key == ord('W'): # Top Down -> y inc, h dec
                roi_y_prop = min(1.0 - 0.05, roi_y_prop + 0.01)
                roi_height_prop = max(0.05, roi_height_prop - 0.01)
                perform_save()
            # s/S: Bottom Edge
            elif key == ord('s'): # Bottom Down -> h inc
                roi_height_prop = min(1.0 - roi_y_prop, roi_height_prop + 0.01)
                perform_save()
            elif key == ord('S'): # Bottom Up -> h dec
                roi_height_prop = max(0.05, roi_height_prop - 0.01)
                perform_save()
            # a/A: Left Edge
            elif key == ord('a'): # Left Left -> x dec, w inc
                roi_x_prop = max(0.0, roi_x_prop - 0.01)
                roi_width_prop = min(1.0 - roi_x_prop, roi_width_prop + 0.01)
                perform_save()
            elif key == ord('A'): # Left Right -> x inc, w dec
                roi_x_prop = min(1.0 - 0.05, roi_x_prop + 0.01)
                roi_width_prop = max(0.05, roi_width_prop - 0.01)
                perform_save()
            # d/D: Right Edge
            elif key == ord('d'): # Right Right -> w inc
                roi_width_prop = min(1.0 - roi_x_prop, roi_width_prop + 0.01)
                perform_save()
            elif key == ord('D'): # Right Left -> w dec
                roi_width_prop = max(0.05, roi_width_prop - 0.01)
                perform_save()

            elif key == ord('R'):
                # Notify Session End
                ts = sheet_timer_start if sheet_timer_start else time.time()
                upload_queue.put(DetectionPayload(ts, current_plate, loading, rehab, total, "SESSION_END"))
                
                loading = rehab = total = 0
                blacklisted_ids.clear()
                armed_objects.clear()
                persistence_queue.clear()
                sheet_timer_start = None
                current_plate = "UNKNOWN" # Also reset to UNKNOWN on manual R if desired by user logic

            elif key == ord('C'):
                debug_low_thresh = not debug_low_thresh
                current_conf = 0.05 if debug_low_thresh else config.conf
                current_iou = 0.15 if debug_low_thresh else config.iou
                print(f"Debug mode: {'ON' if debug_low_thresh else 'OFF'}")
            
            # FPS CALC
            curr_time = time.time()
            fps = 1 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else 0
            prev_time = curr_time
            
    except Exception as e:
        traceback.print_exc()
        input("Press Enter to continue...")

    cap.stop()
    uploader.running = False
    qr_thread.running = False
    cv2.destroyAllWindows()
