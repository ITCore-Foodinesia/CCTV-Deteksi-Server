"""
Integrated Detector for CCTV Detection Engine

This is a modified version of detector.py that uses:
1. SessionManager for unified session state
2. DualUploader for writing to both Sheets and Supabase

The detection logic remains the same - only the session/upload handling is changed.
"""

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
from pyzbar.pyzbar import decode, ZBarSymbol
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .shared import DetectionPayload, QREvent, ControlEvent, PROC_DETECTOR
from .session_manager import SessionManager, get_session_manager

from pathlib import Path

# Get project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
STATE_FILE = str(PROJECT_ROOT / "config" / "v3_state.json")


def save_state(state):
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f)
    except Exception as e:
        print(f"Error saving state: {e}")


def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}


def send_telegram_message(message, token, chat_id, max_retries=3):
    """Send Telegram message directly using requests."""
    if not token or not chat_id:
        print("[Telegram] Token or Chat ID missing, skipping message.")
        return False
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": message}
    
    session = requests.Session()
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    
    try:
        response = session.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            # print(f"[Telegram] Message sent: {message}")
            return True
        else:
            print(f"[Telegram] Failed to send: {response.text}")
            return False
    except Exception as e:
        print(f"[Telegram] Error: {e}")
        return False


def send_telegram_message_async(message, token, chat_id):
    """Send Telegram message asynchronously."""
    threading.Thread(target=send_telegram_message, args=(message, token, chat_id), daemon=True).start()



class ThreadedCamera:
    """Threaded camera capture for low-latency RTSP."""
    
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
        if isinstance(self.src, int) or (isinstance(self.src, str) and self.src.isdigit()):
            print(f"Opening Webcam {self.src}")
            cap = cv2.VideoCapture(int(self.src))
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap

        print(f"Opening RTSP Low Latency: {self.src}")
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
            "rtsp_transport;tcp|fflags;nobuffer|max_delay;500000|flags;low_delay"
        )
        cap = cv2.VideoCapture(self.src, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap
        
    def start(self):
        if self.started:
            return self
        self.started = True
        self.thread = threading.Thread(target=self.update, args=(), daemon=True)
        self.thread.start()
        return self
        
    def update(self):
        while self.started:
            if self.cap is None or not self.cap.isOpened():
                print("Camera disconnected, reconnecting...")
                if self.cap:
                    self.cap.release()
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


class QRWorker(threading.Thread):
    """QR code scanner using pyzbar."""
    
    def __init__(self, result_callback):
        super().__init__(daemon=True)
        self.result_callback = result_callback
        self.latest_frame = None
        self.lock = threading.Lock()
        self.running = True
        self.last_scan = 0
        self.qr_cooldowns = {}
    
    def update_frame(self, frame):
        with self.lock:
            if len(frame.shape) == 3:
                self.latest_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            else:
                self.latest_frame = frame.copy()

    def run(self):
        print(f"[{PROC_DETECTOR}] QR Worker started (pyzbar)")
        while self.running:
            try:
                frame_to_scan = None
                with self.lock:
                    if self.latest_frame is not None:
                        frame_to_scan = self.latest_frame
                        self.latest_frame = None
                
                if frame_to_scan is not None:
                    decoded_objects = decode(frame_to_scan, symbols=[ZBarSymbol.QRCODE])
                    if decoded_objects:
                        for obj in decoded_objects:
                            data = obj.data.decode("utf-8").strip()
                            
                            # Filter: must contain space or be long
                            if " " not in data and len(data) < 9:
                                continue
                            
                            now = time.time()
                            last_time = self.qr_cooldowns.get(data, 0)
                            if now - last_time < 60.0:
                                continue
                                
                            if now - self.last_scan > 2.0:
                                self.result_callback(data)
                                self.last_scan = now
                                self.qr_cooldowns[data] = now
                                
                                # Cleanup old cooldowns
                                for k in list(self.qr_cooldowns.keys()):
                                    if now - self.qr_cooldowns[k] > 120:
                                        del self.qr_cooldowns[k]
                            break
                                
                time.sleep(0.1)
            except Exception as e:
                print(f"[{PROC_DETECTOR}] QR Error: {e}")
                time.sleep(1)


def run_detector_integrated(config, upload_queue: queue.Queue, session_manager: SessionManager):
    """
    Run detector with integrated session manager.
    
    Args:
        config: Configuration object
        upload_queue: Queue for sending payloads to uploader
        session_manager: SessionManager instance for unified session handling
    """
    print(f"[{PROC_DETECTOR}] Starting Integrated Detector...")
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    # Load saved state
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
    saved = load_state()
    state.update(saved)
    
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
    
    # Tracking state
    previous_positions = {}
    track_last_seen = {}
    blacklisted_ids = {}
    
    # Animation
    loading_anim = False
    rehab_anim = False
    anim_start_time = 0
    anim_duration = 1.0
    
    # Timer state
    sheet_timer_start = None
    SHEET_TIMER_DURATION = 600  # 10 minutes

    
    # Load model
    is_tensorrt = config.model.lower().endswith('.engine')
    device = 'cuda' if is_tensorrt or torch.cuda.is_available() else 'cpu'
    
    try:
        model = YOLO(config.model)
        if not is_tensorrt:
            model.to(device)
            if device == 'cuda' and config.half:
                model.half()
    except Exception as e:
        print(f"[{PROC_DETECTOR}] Model load failed: {e}")
        model = None
    
    # Camera
    source = config.source
    if str(source).isdigit():
        source = int(source)
    cap = ThreadedCamera(source).start()
    time.sleep(1)
    
    # QR handler - uses session manager
    def on_qr(data):
        """Handle QR scan - start session via session manager."""
        print(f"[{PROC_DETECTOR}] QR Scanned: {data}")
        session_manager.start_session_from_qr(data)
        
        # Also send to uploader
        upload_queue.put(DetectionPayload(
            timestamp=time.time(),
            plate=data,
            loading=0,
            rehab=0,
            total=0,
            kloter="QR_START"
        ))
        
        # Notify API server
        try:
            payload = {"plate": data, "status": "START", "source": "detector_qr"}
            requests.post("http://localhost:5001/api/telegram_update", json=payload, timeout=1)
        except:
            pass
            
        # Direct Telegram Notification
        msg = f"✅ QR Scanned: {data}\nSistem siap menghitung."
        send_telegram_message_async(msg, config.notify_token, config.notify_chat_id)

    
    qr_thread = QRWorker(on_qr)
    qr_thread.start()
    
    # FPS
    prev_time = time.time()
    fps = 0
    frame_count = 0
    
    w, h = cap.w, cap.h
    if w == 0:
        w, h = 640, 480
    
    window_name = "Monitor Integrated"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, config.width, config.height)
    
    try:
        while True:
            ret, frame = cap.read()
            
            if not ret or frame is None:
                frame = np.zeros((h, w, 3), dtype=np.uint8)
                cv2.putText(frame, "CONNECTING...", (50, h//2), font, 1, (0, 0, 255), 2)
                cv2.imshow(window_name, frame)
                if cv2.waitKey(100) & 0xFF == ord('q'):
                    break
                continue
            
            frame_count += 1
            
            # QR update
            if frame_count % 5 == 0:
                qr_thread.update_frame(frame)
            
            # Get current session state
            loading, rehab, total = session_manager.get_counts()
            current_plate = session_manager.current_plate
            counting_active = session_manager.is_counting_active
            
            # ROI
            detect_x_start = int(roi_x_prop * w)
            detect_y_start = int(roi_y_prop * h)
            detect_x_end = int((roi_x_prop + roi_width_prop) * w)
            detect_y_end = int((roi_y_prop + roi_height_prop) * h)
            
            roi_frame = frame[detect_y_start:detect_y_end, detect_x_start:detect_x_end]
            if roi_frame.size == 0:
                continue
            
            # Inference
            if model is not None:
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
                
                line_pos = int(line_x_prop * w) if detection_mode == "vertical" else int(line_y_prop * h)
                
                if results[0].boxes.id is not None:
                    boxes = results[0].boxes.xyxy.cpu().numpy()
                    ids = results[0].boxes.id.cpu().numpy()
                    
                    for box, track_id in zip(boxes, ids):
                        track_id = int(track_id)
                        
                        x1, y1, x2, y2 = box
                        x1 += detect_x_start
                        x2 += detect_x_start
                        y1 += detect_y_start
                        y2 += detect_y_start
                        
                        cx = int((x1 + x2) / 2)
                        cy = int((y1 + y2) / 2)
                        
                        # Draw box
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                        cv2.putText(frame, f"ID:{track_id}", (int(x1), int(y1)-5), font, 0.5, (0, 255, 0), 2)
                        
                        # Crossing detection
                        if track_id in previous_positions and counting_active:
                            prev_cx, prev_cy = previous_positions[track_id]
                            direction = None
                            
                            if detection_mode == "horizontal":
                                line_y = int(line_y_prop * h)
                                if prev_cy > line_y and cy <= line_y:
                                    direction = 'B2T'
                                elif prev_cy < line_y and cy >= line_y:
                                    direction = 'T2B'
                            else:
                                line_x = int(line_x_prop * w)
                                if prev_cx > line_x and cx <= line_x:
                                    direction = 'R2L'
                                elif prev_cx < line_x and cx >= line_x:
                                    direction = 'L2R'
                            
                            if direction:
                                now = time.time()
                                if now >= blacklisted_ids.get(track_id, 0):
                                    print(f"Crossing: {direction} ID:{track_id}")
                                    
                                    if direction in ['R2L', 'B2T']:
                                        new_loading = session_manager.increment_loading()
                                        loading_anim = True
                                    else:
                                        new_rehab = session_manager.increment_rehab()
                                        rehab_anim = True
                                    
                                    loading, rehab, total = session_manager.get_counts()
                                    anim_start_time = now
                                    blacklisted_ids[track_id] = now + 3.0
                                    
                                    upload_queue.put(DetectionPayload(
                                        timestamp=now,
                                        plate=current_plate,
                                        loading=loading,
                                        rehab=rehab,
                                        total=total,
                                        kloter="AUTO"
                                    ))

                                    # Notify via Telegram
                                    msg = f"✅ Count Update ({current_plate}):\nLoading: {loading}\nRehab: {rehab}\nTotal: {total}"
                                    send_telegram_message_async(msg, config.notify_token, config.notify_chat_id)
                                    
                                    # Reset/Start Timer on new activity
                                    sheet_timer_start = now

                        
                        previous_positions[track_id] = (cx, cy)
                    
                    # Cleanup old positions
                    now = time.time()
                    current_ids = set(ids.astype(int))
                    for tid in current_ids:
                        track_last_seen[tid] = now
                    
                    keys_to_remove = [k for k in previous_positions if now - track_last_seen.get(k, 0) > 2.0]
                    for k in keys_to_remove:
                        if k in previous_positions:
                            del previous_positions[k]
                        if k in track_last_seen:
                            del track_last_seen[k]
            
            # Draw UI
            cv2.rectangle(frame, (10, 10), (220, 130), (255, 255, 255), -1)
            cv2.rectangle(frame, (10, 10), (220, 130), (0, 0, 0), 3)
            
            box_items = [("Loading", loading, (0, 255, 0)), ("Rehab", rehab, (0, 0, 255)), ("Total", total, (255, 0, 0))]
            cy_txt = 40
            for lbl, val, col in box_items:
                cv2.putText(frame, f"{lbl}", (20, cy_txt), font, 0.7, col, 2)
                cv2.putText(frame, ":", (120, cy_txt), font, 0.7, col, 2)
                cv2.putText(frame, str(val), (140, cy_txt), font, 0.7, col, 2)
                cy_txt += 30
            
            # Timer Logic & Display
            now = time.time()
            
            # Start timer if session is active (regardless of count)
            if counting_active and sheet_timer_start is None:
                sheet_timer_start = now
            
            # Stop timer if session ended
            if not counting_active:
                sheet_timer_start = None
                
            if sheet_timer_start is not None:
                elapsed = now - sheet_timer_start
                remaining = max(0, SHEET_TIMER_DURATION - elapsed)
                mins, secs = divmod(int(remaining), 60)
                
                # Check expiration
                if elapsed >= SHEET_TIMER_DURATION:
                    print(f"[{PROC_DETECTOR}] Timer expired! Finalizing session.")
                    
                    # Notify
                    msg = f"⏱️ Waktu Habis (10 menit) untuk {current_plate}.\nSesi diakhiri otomatis.\nFinal Counts:\nLoading: {loading}\nRehab: {rehab}"
                    send_telegram_message_async(msg, config.notify_token, config.notify_chat_id)
                    
                    # End Session
                    session_manager.end_session()
                    
                    # Reset local state
                    sheet_timer_start = None
                    # loading, rehab, total = 0, 0, 0 # Don't reset immediately, let next loop update from session_manager
                    # current_plate = "UNKNOWN"
                    blacklisted_ids.clear()
                    previous_positions.clear()
                    
                else:
                    # Draw Timer Box (Same style as Count Stats)
                    timer_text = f"TIMER: {mins:02d}:{secs:02d}"
                    
                    # Position below the Count Stats box (which ends at y=130)
                    box_x1, box_y1 = 10, 140
                    box_x2, box_y2 = 230, 180
                    
                    # White background with Black border
                    cv2.rectangle(frame, (box_x1, box_y1), (box_x2, box_y2), (255, 255, 255), -1)
                    cv2.rectangle(frame, (box_x1, box_y1), (box_x2, box_y2), (0, 0, 0), 3)
                    
                    # Red Text inside the box
                    color = (0, 0, 255)  # BGR Red
                    text_x = box_x1 + 20
                    text_y = box_y1 + 28
                    cv2.putText(frame, timer_text, (text_x, text_y), font, 0.7, color, 2)

            
            # FPS
            fps_text = f"FPS: {fps:.1f}"
            (fw, fh), _ = cv2.getTextSize(fps_text, font, 0.9, 2)
            fx = w - fw - 20
            cv2.rectangle(frame, (fx-5, 35-fh-5), (fx+fw+5, 45), (0, 0, 0), -1)
            cv2.putText(frame, fps_text, (fx, 40), font, 0.9, (255, 255, 255), 2)
            
            # Plate
            p_text = current_plate
            (pw, ph), _ = cv2.getTextSize(p_text, font, 0.9, 2)
            px = w - pw - 20
            cv2.rectangle(frame, (px-5, 85-ph-5), (px+pw+5, 95), (255, 255, 255), -1)
            cv2.rectangle(frame, (px-5, 85-ph-5), (px+pw+5, 95), (0, 0, 0), 2)
            cv2.putText(frame, p_text, (px, 90), font, 0.9, (0, 0, 0), 2)
            
            # Status
            if not counting_active:
                msg = "MENUNGGU QR / APP..."
                idx = int(time.time() * 4) % (len(msg) + 5)
                show_msg = msg[:min(len(msg), idx)]
                (mw, mh), _ = cv2.getTextSize(msg, font, 0.9, 2)
                cv2.rectangle(frame, (10, 210-mh-10), (10+mw+20, 220), (255, 255, 255), -1)
                cv2.rectangle(frame, (10, 210-mh-10), (10+mw+20, 220), (0, 0, 0), 2)
                cv2.putText(frame, show_msg, (20, 210), font, 0.9, (0, 165, 255), 2)
            
            # Detection line
            if detection_mode == "horizontal":
                cv2.line(frame, (0, line_pos), (w, line_pos), (0, 255, 0), 2)
            else:
                cv2.line(frame, (line_pos, 0), (line_pos, h), (0, 255, 0), 2)
            
            # ROI
            cv2.rectangle(frame, (detect_x_start, detect_y_start), (detect_x_end, detect_y_end), (255, 255, 0), 2)
            
            # Animation
            if loading_anim and time.time() - anim_start_time < anim_duration:
                if int(time.time() * 10) % 2 == 0:
                    cv2.putText(frame, "+1", (10, 60), font, 1.0, (0, 255, 0), 3)
            elif rehab_anim and time.time() - anim_start_time < anim_duration:
                if int(time.time() * 10) % 2 == 0:
                    cv2.putText(frame, "+1", (10, 90), font, 1.0, (0, 0, 255), 3)
            else:
                loading_anim = False
                rehab_anim = False
            
            cv2.imshow(window_name, frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord('q'):
                break
            
            # FPS calc
            curr_time = time.time()
            fps = 1 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else 0
            prev_time = curr_time
            
    except Exception as e:
        traceback.print_exc()
    
    cap.stop()
    qr_thread.running = False
    cv2.destroyAllWindows()
