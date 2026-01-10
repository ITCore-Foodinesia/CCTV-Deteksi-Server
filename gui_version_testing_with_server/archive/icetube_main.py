import argparse
import cv2
import numpy as np
from ultralytics import YOLO
import torch
import time
import json
import os
import datetime
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import sys
import requests
import threading
from queue import Queue, Empty as QueueEmpty
import subprocess

# Fix encoding untuk Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        # Python < 3.7
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

STATE_FILE = "D:\\CCTV\\state_main_new.json"

def send_telegram_message(message, bot_token, chat_id, max_retries=3):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    formatted_message = f"*{timestamp}* {message}"
    payload = {"chat_id": chat_id, "text": formatted_message, "parse_mode": "Markdown"}
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, json=payload, timeout=30)  # Tambah timeout
            if response.status_code == 200:
                print(f"Pesan Telegram berhasil dikirim ke {chat_id}: {formatted_message}")
                return True
            else:
                print(f"Gagal mengirim pesan Telegram (attempt {attempt+1}): {response.text}")
        except requests.exceptions.Timeout:
            print(f"Timeout mengirim pesan Telegram (attempt {attempt+1})")
        except requests.exceptions.ConnectionError:
            print(f"Connection error mengirim pesan Telegram (attempt {attempt+1})")
        except Exception as e:
            print(f"Error mengirim pesan Telegram (attempt {attempt+1}): {e}")
        
        if attempt < max_retries - 1:
            time.sleep(2 ** attempt)  # Exponential backoff
    
    print(f"Gagal mengirim pesan Telegram setelah {max_retries} attempts")
    return False

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {"line_x": 0.5, "mid_gap": 0.04, "roi_x": 0.5, "roi_width": 0.2, "roi_y": 0.5, "roi_height": 1.0}

def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

def check_connection_health(cap, last_frame_time):
    """Check if RTSP connection is healthy"""
    current_time = time.time()
    if current_time - last_frame_time > 30:  # 30 detik tanpa frame baru
        return False
    return True

def open_rtsp_robust(source):
    protocols = ["tcp", "udp"]
    for attempt in range(10):  # Tambah retry attempts
        for proto in protocols:
            print(f"Attempt {attempt+1}: Connecting RTSP with {proto}...")
            # Tambah timeout dan buffer settings yang lebih robust
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{proto}|max_delay;0|stimeout;10000000|fflags;nobuffer|fpsprobesize;0|analyzeduration;0|rw_timeout;10000000"
            cap = cv2.VideoCapture(source)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FPS, 25)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
                # cap.set(cv2.CAP_PROP_TIMEOUT, 10000)  # Tidak tersedia di OpenCV ini
                print(f"RTSP connected using {proto} at 25 FPS")
                return cap
            cap.release()
            time.sleep(2)  # Tambah delay antar attempt
    print("Failed to connect to RTSP after multiple attempts")
    return None

def get_worksheet(gc, sheet_id, worksheet_name):
    sheet = gc.open_by_key(sheet_id)
    try:
        ws = sheet.worksheet(worksheet_name)
    except gspread.exceptions.WorksheetNotFound:
        ws = sheet.add_worksheet(title=worksheet_name, rows=10000, cols=10)
        ws.append_row(["Plat", "Tanggal", "Jam Datang", "Jam Selesai", "Loading", "Rehab", "Kloter"])
    return ws

def find_row_for_plate(ws, plate, today_str):
    rows = ws.get_all_values()
    for i, row in enumerate(rows[1:], start=2):
        if row[0] == plate and row[1] == today_str and not row[3]:
            return i
    return None

def calculate_kloter(ws, plate, today_str):
    try:
        rows = ws.get_all_values()
        count = 0
        for row in rows[1:]:  # Skip header
            if len(row) >= 2 and row[0] == plate and row[1] == today_str:
                count += 1
        print(f"Found {count} existing rows for {plate} on {today_str}")
        return count + 1
    except Exception as e:
        print(f"Error calculating kloter for {plate}: {e}")
        return 1  # Default to 1 if error

def finalize_sheet(ws, row_idx, loading, rehab):
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    ws.update_cell(row_idx, 4, now_str)
    ws.update_cell(row_idx, 5, loading)
    ws.update_cell(row_idx, 6, rehab)

def scan_qr_from_frame(frame):
    qr_detector = cv2.QRCodeDetector()
    try:
        retval, decoded_info, points, _ = qr_detector.detectAndDecodeMulti(frame)
        if retval:
            for info in decoded_info:
                if info:
                    return info.strip()
        else:
            decoded_info, points, _ = qr_detector.detectAndDecode(frame)
            if decoded_info:
                return decoded_info.strip()
    except Exception as e:
        print(f"QR decoding error: {e}")
    return None

def qr_scanner(frame_queue, qr_queue, stop_event):
    while not stop_event.is_set():
        if not frame_queue.empty():
            frame = frame_queue.get()
            qr_data = scan_qr_from_frame(frame)
            if qr_data:
                qr_queue.put(qr_data)
        time.sleep(0.3)

def start_qr_standby(source, model, creds, sheet_id, worksheet, notify_token, notify_chat_id, system_token, system_chat_id):
    qr_standby_cmd = [
        "python", "D:\\CCTVFIX\\qr_standby.py",  # ✅ Fix path
        "--source", source,
        "--source-type", "rtsp",
        "--model", model,
        "--creds", creds,
        "--sheet_id", sheet_id,
        "--worksheet", worksheet,
        "--notify_token", notify_token,  # ✅ Tambah missing args
        "--notify_chat_id", notify_chat_id,
        "--system_token", system_token,
        "--system_chat_id", system_chat_id
    ]
    try:
        # ✅ Jangan pakai communicate() untuk long-running process
        process = subprocess.Popen(qr_standby_cmd, 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE, 
                                 text=True,
                                 encoding='utf-8',
                                 errors='replace',
                                 creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0)
        
        # ✅ Cek apakah process berhasil start (tanpa timeout)
        time.sleep(3)  # Tunggu 3 detik untuk initialization
        if process.poll() is None:  # Process masih running
            print(f"Started qr_standby.py with PID {process.pid}")
            return True
        else:
            # Process sudah exit, cek error
            stdout, stderr = process.communicate()
            error_msg = stderr if stderr else "Unknown error"
            print(f"qr_standby.py exited immediately: {error_msg}")
            return False
            
    except FileNotFoundError:
        print("qr_standby.py file not found!")
        return False
    except Exception as e:
        error_msg = str(e).encode('ascii', errors='replace').decode('ascii')
        print(f"Failed to start qr_standby.py: {error_msg}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Icetube Main Detector with QR Scanning (Vertical Line - FIXED CROSSING LOGIC)")
    parser.add_argument("--source", required=True, help="RTSP source")
    parser.add_argument("--model", required=True, help="YOLO model path")
    parser.add_argument("--imgsz", default=320, type=int, help="YOLO image size")
    parser.add_argument("--conf", default=0.15, type=float, help="YOLO confidence")
    parser.add_argument("--iou", default=0.25, type=float, help="YOLO IoU")
    parser.add_argument("--width", default=960, type=int, help="Display width")
    parser.add_argument("--line_x", default=0.5, type=float, help="Initial line_x position (horizontal)")
    parser.add_argument("--mid_gap", default=0.04, type=float, help="Initial mid_gap (smaller = easier crossing detection)")
    parser.add_argument("--roi_x_prop", default=0.5, type=float, help="ROI center x proportion (0-1)")
    parser.add_argument("--roi_width_prop", default=0.2, type=float, help="ROI width proportion (0-1)")
    parser.add_argument("--roi_y_prop", default=0.5, type=float, help="ROI center y proportion (0-1)")
    parser.add_argument("--roi_height_prop", default=1.0, type=float, help="ROI height proportion (0-1)")
    parser.add_argument("--idle_secs", default=600, type=int, help="Idle seconds to exit (default: 600 = 10 menit)")
    parser.add_argument("--sheet_id", required=True, help="Google Sheet ID")
    parser.add_argument("--creds", required=True, help="Credentials JSON path")
    parser.add_argument("--worksheet", required=True, help="Worksheet name")
    parser.add_argument("--plate", required=True, help="Initial plate from QR standby")
    parser.add_argument("--notify_token", required=True, help="Telegram bot token for driver notification")
    parser.add_argument("--notify_chat_id", required=True, help="Telegram chat ID for driver notification")
    parser.add_argument("--test_token", default=None, help="Telegram bot token for testing notification")
    parser.add_argument("--test_chat_id", default=None, help="Telegram chat ID for testing notification")
    parser.add_argument("--half", action='store_true', help="Use FP16 half-precision inference for GPU speed up")
    args = parser.parse_args()

    system_token = "7990876346:AAEm4bpPB9fKiVtC5il4dFWEANc1didd6jk"
    system_chat_id = "7678774830"

    current_plate = args.plate
    last_scan_time = time.time()
    scan_cooldown = 60
    
    # ✅ Debug logging untuk parameter
    print(f"🔍 DEBUG: Starting icetube_main.py")
    print(f"🔍 DEBUG: Current plate: {current_plate}")
    print(f"🔍 DEBUG: Sheet ID: {args.sheet_id}")
    print(f"🔍 DEBUG: Worksheet: {args.worksheet}")
    print(f"🔍 DEBUG: Notify token: {args.notify_token}")
    print(f"🔍 DEBUG: Notify chat ID: {args.notify_chat_id}")

    if current_plate != "UNKNOWN":
        send_telegram_message(f"✅ QR {current_plate} sudah discan. Sistem siap menghitung!", args.notify_token, args.notify_chat_id)
    elif args.test_token and args.test_chat_id:
        send_telegram_message("⏳ Menunggu scan QR. Silakan scan QR Anda.", args.test_token, args.test_chat_id)

    state = load_state()
    line_x_prop = state.get("line_x", args.line_x)
    mid_gap_prop = state.get("mid_gap", args.mid_gap)
    roi_x_prop = state.get("roi_x", args.roi_x_prop)
    roi_width_prop = state.get("roi_width", args.roi_width_prop)
    roi_y_prop = state.get("roi_y", args.roi_y_prop)
    roi_height_prop = state.get("roi_height", args.roi_height_prop)

    # Deteksi apakah menggunakan TensorRT engine file
    is_tensorrt = args.model.lower().endswith('.engine')
    
    if is_tensorrt:
        print(f"Using TensorRT engine: {args.model}")
        device = 'cuda'  # TensorRT hanya berjalan di CUDA
    else:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {device}")
    
    try:
        model = YOLO(args.model)
        # Untuk TensorRT engine, skip operasi PyTorch yang tidak diperlukan
        if not is_tensorrt:
            model.to(device)
            if device == 'cuda':
                torch.backends.cudnn.benchmark = True
                if args.half:
                    model.half()
        else:
            print("TensorRT engine loaded - using optimized inference")
    except Exception as e:
        print(f"Error loading model: {e}")
        send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.notify_token, args.notify_chat_id)
        if args.test_token and args.test_chat_id:
            send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.test_token, args.test_chat_id)
        sys.exit(1)

    cap = open_rtsp_robust(args.source)
    if not cap:
        send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.notify_token, args.notify_chat_id)
        if args.test_token and args.test_chat_id:
            send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.test_token, args.test_chat_id)
        sys.exit(1)

    ret, frame = cap.read()
    if not ret:
        cap.release()
        send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.notify_token, args.notify_chat_id)
        if args.test_token and args.test_chat_id:
            send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.test_token, args.test_chat_id)
        sys.exit(1)
    h, w = frame.shape[:2]
    display_w = args.width
    display_h = int(display_w * h / w)

    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name(args.creds, scope)
    gc = gspread.authorize(creds)
    ws = get_worksheet(gc, args.sheet_id, args.worksheet)

    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    row_idx = None
    kloter = None
    
    # ✅ UNKNOWN juga dibuat row di Google Sheets
    if current_plate == "UNKNOWN":
        try:
            # Buat row untuk UNKNOWN
            print(f"🔍 Creating UNKNOWN row for {today_str}")
            print(f"🔍 Current plate: {current_plate}")
            print(f"🔍 Sheet ID: {args.sheet_id}")
            print(f"🔍 Worksheet: {args.worksheet}")
            
            kloter = calculate_kloter(ws, "UNKNOWN", today_str)
            now_str = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"🔍 UNKNOWN kloter: {kloter}, time: {now_str}")
            
            # Tambah row ke Google Sheets
            print(f"🔍 Appending row to Google Sheets...")
            ws.append_row(["UNKNOWN", today_str, now_str, "", 0, 0, kloter])
            print(f"✅ UNKNOWN row appended to Google Sheets")
            
            # Get row index
            row_idx = len(ws.get_all_values())
            print(f"✅ Created UNKNOWN row at index {row_idx}")
            
            # ✅ Notifikasi konfirmasi
            print(f"🔍 Sending confirmation notification...")
            send_telegram_message(f"✅ UNKNOWN row created: Plat=UNKNOWN, Tanggal={today_str}, Jam Datang={now_str}, Kloter={kloter}", args.notify_token, args.notify_chat_id)
            print(f"✅ Notification sent")
            
        except Exception as e:
            print(f"❌ Error creating UNKNOWN row: {e}")
            import traceback
            traceback.print_exc()
            send_telegram_message(f"❌ Error creating UNKNOWN row: {e}", args.notify_token, args.notify_chat_id)
    else:
        row_idx = find_row_for_plate(ws, current_plate, today_str)
        if row_idx is None:
            kloter = calculate_kloter(ws, current_plate, today_str)
            now_str = datetime.datetime.now().strftime("%H:%M:%S")
            ws.append_row([current_plate, today_str, now_str, "", 0, 0, kloter])
            row_idx = len(ws.get_all_values())

    frame_queue = Queue(maxsize=1)
    qr_queue = Queue(maxsize=1)
    stop_event = threading.Event()

    qr_thread = threading.Thread(target=qr_scanner, args=(frame_queue, qr_queue, stop_event))
    qr_thread.daemon = True
    qr_thread.start()

    capture_queue = Queue(maxsize=4)

    def capture_thread(cap, capture_queue, stop_event):
        last_successful_read = time.time()
        consecutive_failures = 0
        max_consecutive_failures = 10
        
        while not stop_event.is_set():
            ret, frame = cap.read()
            if ret:
                capture_queue.put(frame)
                last_successful_read = time.time()
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                print(f"RTSP read failed (consecutive failures: {consecutive_failures})")
                
                # Jika terlalu banyak failure, coba reconnect
                if consecutive_failures >= max_consecutive_failures:
                    print("Too many consecutive failures, attempting to reconnect...")
                    cap.release()
                    time.sleep(5)
                    # Coba reconnect (kamu perlu implementasi reconnect logic)
                    break
                
                time.sleep(0.1)  # Kurangi delay untuk faster recovery
            
            # Heartbeat check
            if time.time() - last_successful_read > 30:  # 30 detik tanpa frame
                print("No frames received for 30 seconds, possible connection issue")
                break

    capture_stop_event = threading.Event()
    capture_thread_obj = threading.Thread(target=capture_thread, args=(cap, capture_queue, capture_stop_event))
    capture_thread_obj.daemon = True
    capture_thread_obj.start()

    loading = 0
    rehab = 0
    total = 0
    last_activity = time.time()
    blacklisted_ids = {}
    prev_time = time.time()
    fps = 0
    loading_anim = False
    rehab_anim = False
    anim_start_time = 0
    anim_duration = 1.0
    
    # Health check variables
    last_frame_received = time.time()

    debug_low_thresh = False
    current_conf = args.conf
    current_iou = args.iou

    # === LOGIKA SEDERHANA: TANPA TRACK BACK, HANYA BAND-BASED DETECTION ===
    track_band_state = {}  # {track_id: 'left' or 'right'} - posisi band saat ini

    frame_count = 0

    try:
        while True:
            try:
                if capture_queue.empty():
                    time.sleep(0.001)
                    continue
                frame = capture_queue.get_nowait()
                last_frame_received = time.time()  # Update health check

                frame_count += 1
                if frame_count % 10 == 0:
                    frame_queue.put(frame.copy())
                
                # Write heartbeat setiap 30 detik
                if frame_count % 300 == 0:  # 300 frames = ~30 detik pada 10 FPS
                    try:
                        with open("D:\\CCTVFIX\\heartbeat_log.txt", "a") as f:
                            f.write(f"{datetime.datetime.now()} - icetube_main heartbeat\n")
                    except:
                        pass

                if not qr_queue.empty():
                    qr_data = qr_queue.get()
                    if qr_data:
                        if qr_data == "FINISH":
                            # ✅ Selalu finalize data (termasuk UNKNOWN)
                            if row_idx is not None:
                                finalize_sheet(ws, row_idx, loading, rehab)
                                send_telegram_message(f"✅ Penghitungan untuk {current_plate} selesai (QR FINISH).", args.notify_token, args.notify_chat_id)
                            else:
                                # Jika UNKNOWN tidak punya row_idx, buat dan simpan
                                if current_plate == "UNKNOWN":
                                    kloter = calculate_kloter(ws, "UNKNOWN", today_str)
                                    now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                    ws.append_row(["UNKNOWN", today_str, now_str, datetime.datetime.now().strftime("%H:%M:%S"), loading, rehab, kloter])
                                    send_telegram_message(f"✅ Data UNKNOWN disimpan (QR FINISH): Loading={loading}, Rehab={rehab}.", args.notify_token, args.notify_chat_id)
                            
                            send_telegram_message("🔄 Kembali ke mode QR standby...", args.notify_token, args.notify_chat_id)
                            if not start_qr_standby(args.source, args.model, args.creds, args.sheet_id, args.worksheet, args.notify_token, args.notify_chat_id, system_token, system_chat_id):
                                send_telegram_message("❌ Gagal kembali ke QR standby. Cek sistem!", system_token, system_chat_id)
                            break
                        elif qr_data != current_plate:
                            # ✅ Selalu finalize data sebelumnya (termasuk UNKNOWN)
                            if row_idx is not None:
                                finalize_sheet(ws, row_idx, loading, rehab)
                                send_telegram_message(f"✅ Penghitungan untuk {current_plate} selesai. Mulai untuk plat baru {qr_data}.", args.notify_token, args.notify_chat_id)
                            else:
                                # Jika tidak ada row_idx, tetap simpan data UNKNOWN
                                if current_plate == "UNKNOWN":
                                    kloter = calculate_kloter(ws, "UNKNOWN", today_str)
                                    now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                    ws.append_row(["UNKNOWN", today_str, now_str, datetime.datetime.now().strftime("%H:%M:%S"), loading, rehab, kloter])
                                    send_telegram_message(f"✅ Data UNKNOWN disimpan: Loading={loading}, Rehab={rehab}. Mulai untuk plat baru {qr_data}.", args.notify_token, args.notify_chat_id)
                            
                            # ✅ Switch ke plat baru dan reset
                            current_plate = qr_data
                            last_scan_time = time.time()
                            row_idx = find_row_for_plate(ws, current_plate, today_str)
                            if row_idx is None:
                                kloter = calculate_kloter(ws, current_plate, today_str)
                                now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                ws.append_row([current_plate, today_str, now_str, "", 0, 0, kloter])
                                row_idx = len(ws.get_all_values())
                            loading = rehab = total = 0
                            blacklisted_ids.clear()
                            track_band_state.clear()
                            
                            # ✅ Notifikasi setelah reset hitungan
                            send_telegram_message(f"✅ Plat {current_plate} icetube siap di hitung", args.notify_token, args.notify_chat_id)
                        elif time.time() - last_scan_time > scan_cooldown:
                            # ✅ Selalu finalize data (termasuk UNKNOWN)
                            if row_idx is not None:
                                finalize_sheet(ws, row_idx, loading, rehab)
                                send_telegram_message(f"✅ Penghitungan untuk {current_plate} selesai (QR sama discan lagi).", args.notify_token, args.notify_chat_id)
                            else:
                                # Jika UNKNOWN tidak punya row_idx, buat dan simpan
                                if current_plate == "UNKNOWN":
                                    kloter = calculate_kloter(ws, "UNKNOWN", today_str)
                                    now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                    ws.append_row(["UNKNOWN", today_str, now_str, datetime.datetime.now().strftime("%H:%M:%S"), loading, rehab, kloter])
                                    send_telegram_message(f"✅ Data UNKNOWN disimpan (QR sama discan lagi): Loading={loading}, Rehab={rehab}.", args.notify_token, args.notify_chat_id)
                            
                            send_telegram_message("🔄 Kembali ke mode QR standby...", args.notify_token, args.notify_chat_id)
                            if not start_qr_standby(args.source, args.model, args.creds, args.sheet_id, args.worksheet, args.notify_token, args.notify_chat_id, system_token, system_chat_id):
                                send_telegram_message("❌ Gagal kembali ke QR standby. Cek sistem!", system_token, system_chat_id)
                            break

                now = time.time()
                line_x = int(w * line_x_prop)
                gap_px = int(w * mid_gap_prop / 2)
                left_band = line_x - gap_px
                right_band = line_x + gap_px

                roi_scale = 0.9
                detect_frame_w = int(display_w * roi_scale)
                detect_frame_h = int(display_h * roi_scale)
                detect_x_start = (display_w - detect_frame_w) // 2
                detect_y_start = (display_h - detect_frame_h) // 2
                detect_x_end = detect_x_start + detect_frame_w
                detect_y_end = detect_y_start + detect_frame_h

                detect_x_start_orig = int(detect_x_start * w / display_w)
                detect_y_start_orig = int(detect_y_start * h / display_h)
                detect_x_end_orig = int(detect_x_end * w / display_w)
                detect_y_end_orig = int(detect_y_end * h / display_h)
                detect_frame = frame[detect_y_start_orig:detect_y_end_orig, detect_x_start_orig:detect_x_end_orig]

                # Untuk TensorRT, gunakan device='cuda' dan skip half precision (sudah dioptimasi)
                if is_tensorrt:
                    results = model.track(detect_frame, persist=True, imgsz=args.imgsz, conf=current_conf, iou=current_iou, device='cuda', verbose=False)
                else:
                    results = model.track(detect_frame, persist=True, imgsz=args.imgsz, conf=current_conf, iou=current_iou, device=device, verbose=False, half=args.half if device == 'cuda' else False)

                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        conf_score = box.conf[0].item()
                        if conf_score < current_conf:
                            continue

                        track_id = int(box.id[0].item()) if box.id is not None else None
                        if track_id is None or now < blacklisted_ids.get(track_id, 0):
                            continue

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        x1 += detect_x_start_orig
                        x2 += detect_x_start_orig
                        y1 += detect_y_start_orig
                        y2 += detect_y_start_orig
                        cx = (x1 + x2) // 2
                        cy = (y1 + y2) // 2

                        # === LOGIKA SEDERHANA: BAND-BASED DETECTION TANPA TRACK BACK ===
                        # Tentukan posisi band saat ini berdasarkan cx
                        if cx < left_band:
                            current_band = 'left'
                        elif cx > right_band:
                            current_band = 'right'
                        else:
                            current_band = 'middle'  # Di tengah-tengah band, tidak dihitung
                        
                        # Ambil posisi band sebelumnya (jika ada)
                        prev_band = track_band_state.get(track_id, None)

                        crossing_detected = False
                        direction = None
                        
                        # Deteksi crossing hanya jika ada perubahan band yang jelas
                        if prev_band is not None and prev_band != current_band:
                            # Crossing dari kiri ke kanan (Rehab)
                            if prev_band == 'left' and current_band == 'right':
                                direction = 'L2R'
                                crossing_detected = True
                            # Crossing dari kanan ke kiri (Loading)
                            elif prev_band == 'right' and current_band == 'left':
                                direction = 'R2L'
                                crossing_detected = True

                        # Update band state untuk track_id ini
                        if current_band != 'middle':
                            track_band_state[track_id] = current_band
                        
                        if crossing_detected:
                            print(f"Crossing detected: {direction}, track_id={track_id}, prev_band={prev_band}, current_band={current_band}, cx={cx}, line_x={line_x}")
                            if direction == 'L2R':
                                # L2R sekarang = Rehab
                                rehab += 1
                                total = loading - rehab
                                rehab_anim = True
                                anim_start_time = now
                                print(f"[{datetime.datetime.now()}] Rehab hit: track_id={track_id}, conf={conf_score}")
                            elif direction == 'R2L':
                                # R2L sekarang = Loading
                                loading += 1
                                total = loading - rehab
                                loading_anim = True
                                anim_start_time = now
                                print(f"[{datetime.datetime.now()}] Loading hit: track_id={track_id}, conf={conf_score}")
                            last_activity = now
                            blacklisted_ids[track_id] = now + 0.5  # Reduced from 1.0 to 0.5 for faster re-detection
                            # Band state sudah diupdate di atas, tidak perlu update lagi

                        box_color = (0, 255, 0) if not crossing_detected else (255, 0, 255)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

                cv2.line(frame, (line_x, 0), (line_x, h), (255, 0, 0), 2)
                cv2.line(frame, (left_band, 0), (left_band, h), (0, 0, 255), 1)
                cv2.line(frame, (right_band, 0), (right_band, h), (0, 0, 255), 1)

                display_frame = cv2.resize(frame, (display_w, display_h))
                cv2.rectangle(display_frame, (detect_x_start, detect_y_start), (detect_x_end, detect_y_end), (255, 0, 0), 2)

                idle_elapsed = now - last_activity
                remaining_secs = max(0, args.idle_secs - idle_elapsed)
                mins, secs = divmod(int(remaining_secs), 60)
                countdown_text = f"Idle Countdown: {mins:02d}:{secs:02d}"
                text_color = (0, 0, 255) if remaining_secs < 60 else (0, 165, 255)
                cv2.putText(display_frame, countdown_text, (10, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color, 2)
                
                # Countdown timer di ujung kanan atas (warna merah dan bold)
                countdown_timer_text = f"Auto Exit: {mins:02d}:{secs:02d}"
                timer_x = display_w - 200  # Posisi kanan
                timer_y = 30  # Posisi atas
                timer_color = (0, 0, 255)  # Warna merah (BGR)
                cv2.putText(display_frame, countdown_timer_text, (timer_x, timer_y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, timer_color, 3)  # Font 0.8 dan thickness 3 untuk bold

                cv2.putText(display_frame, f"Loading: {loading}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                cv2.putText(display_frame, f"Rehab: {rehab}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                cv2.putText(display_frame, f"Total: {total}", (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 255), 2)
                cv2.putText(display_frame, f"FPS: {fps:.1f}", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
                plate_text = f"Plate: {current_plate}"
                (text_width, text_height), _ = cv2.getTextSize(plate_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
                plate_x = (display_w - text_width) // 2
                plate_y = display_h - 30
                cv2.putText(display_frame, plate_text, (plate_x, plate_y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 165, 0), 2)
                if current_plate == "UNKNOWN":
                    cv2.putText(display_frame, "Menunggu Scan QR...", (10, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
                cv2.putText(display_frame, f"Conf: {current_conf:.2f} IoU: {current_iou:.2f}", (10, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                cv2.putText(display_frame, f"line_x: {line_x_prop:.2f} gap: {mid_gap_prop:.2f} roi_x: {roi_x_prop:.2f} w: {roi_width_prop:.2f} y: {roi_y_prop:.2f} h: {roi_height_prop:.2f}", (10, display_h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
                cv2.putText(display_frame, "g/G: geser garis, h/H: gap, I: +height, K: -height, J: geser kiri, L: geser kanan, R: reset, Q: quit, C: toggle low thresh", (10, display_h - 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

                if loading_anim and (now - anim_start_time) <= anim_duration:
                    if (int(now * 10) % 2) == 0:
                        cv2.putText(display_frame, "+1", (150, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                elif loading_anim:
                    loading_anim = False

                if rehab_anim and (now - anim_start_time) <= anim_duration:
                    if (int(now * 10) % 2) == 0:
                        cv2.putText(display_frame, "+1", (150, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                elif rehab_anim:
                    rehab_anim = False

                cv2.imshow("Icetube Main with QR", display_frame)

                curr_time = time.time()
                fps = 1 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else fps
                prev_time = curr_time

                key = cv2.waitKey(1) & 0xFF
                if key == ord('g'):
                    line_x_prop = max(0.0, line_x_prop - 0.01)
                elif key == ord('G'):
                    line_x_prop = min(1.0, line_x_prop + 0.01)
                elif key == ord('h'):
                    mid_gap_prop = max(0.0, mid_gap_prop - 0.01)
                elif key == ord('H'):
                    mid_gap_prop = min(1.0, mid_gap_prop + 0.01)
                elif key == ord('J'):
                    roi_x_prop = max(0.0, roi_x_prop - 0.01)
                elif key == ord('L'):
                    roi_x_prop = min(1.0, roi_x_prop + 0.01)
                elif key == ord('I'):
                    roi_height_prop = min(1.0, roi_height_prop + 0.01)
                elif key == ord('K'):
                    roi_height_prop = max(0.1, roi_height_prop - 0.01)
                elif key == ord('R'):
                    loading = rehab = total = 0
                    blacklisted_ids.clear()
                    track_band_state.clear()
                elif key == ord('C'):
                    debug_low_thresh = not debug_low_thresh
                    current_conf = 0.05 if debug_low_thresh else args.conf
                    current_iou = 0.15 if debug_low_thresh else args.iou  # Reduced from 0.2 to 0.15
                    print(f"Debug mode: {'ON' if debug_low_thresh else 'OFF'} (conf={current_conf}, iou={current_iou})")
                elif key == ord('Q'):
                    break

                # Cek idle timeout (10 menit default) - jika habis, kembali ke QR standby
                if time.time() - last_activity > args.idle_secs:
                    # ✅ Selalu finalize data (termasuk UNKNOWN)
                    if row_idx is not None:
                        finalize_sheet(ws, row_idx, loading, rehab)
                        send_telegram_message(f"✅ Penghitungan untuk {current_plate} selesai (idle timeout {args.idle_secs//60} menit). Kembali ke QR standby.", args.notify_token, args.notify_chat_id)
                    else:
                        # Jika UNKNOWN tidak punya row_idx, buat dan simpan
                        if current_plate == "UNKNOWN":
                            kloter = calculate_kloter(ws, "UNKNOWN", today_str)
                            now_str = datetime.datetime.now().strftime("%H:%M:%S")
                            ws.append_row(["UNKNOWN", today_str, now_str, datetime.datetime.now().strftime("%H:%M:%S"), loading, rehab, kloter])
                            send_telegram_message(f"✅ Data UNKNOWN disimpan (idle timeout {args.idle_secs//60} menit): Loading={loading}, Rehab={rehab}. Kembali ke QR standby.", args.notify_token, args.notify_chat_id)
                    
                    if args.test_token and args.test_chat_id:
                        send_telegram_message("⏳ Menunggu scan QR. Silakan scan QR Anda.", args.test_token, args.test_chat_id)
                    send_telegram_message("🔄 Kembali ke mode QR standby...", args.notify_token, args.notify_chat_id)
                    time.sleep(2)
                    if not start_qr_standby(args.source, args.model, args.creds, args.sheet_id, args.worksheet, args.notify_token, args.notify_chat_id, system_token, system_chat_id):
                        send_telegram_message("❌ Gagal kembali ke QR standby. Cek sistem!", system_token, system_chat_id)
                    break

                blacklisted_ids = {k: v for k, v in blacklisted_ids.items() if now < v}
                
                # Health check - jika tidak ada frame baru dalam 30 detik
                if not check_connection_health(cap, last_frame_received):
                    print("Connection health check failed, attempting recovery...")
                    send_telegram_message("⚠️ Koneksi bermasalah, mencoba reconnect...", args.notify_token, args.notify_chat_id)
                    # Implementasi reconnect logic
                    break

            except QueueEmpty:
                continue
            except cv2.error as e:
                print(f"OpenCV error: {e}")
                if "timeout" in str(e).lower():
                    print("OpenCV timeout detected, attempting recovery...")
                    time.sleep(2)
                    continue
            except requests.exceptions.RequestException as e:
                print(f"Network request error: {e}")
                # Skip this iteration, continue processing
                time.sleep(1)
                continue
            except Exception as e:
                print(f"Unexpected error in main loop: {e}")
                # Log error but don't crash
                time.sleep(1)
                continue

    except Exception as e:
        print(f"Critical error during cleanup: {e}")

    finally:
        stop_event.set()
        capture_stop_event.set()
        capture_thread_obj.join(timeout=5)
        if cap.isOpened():
            cap.release()
        cv2.destroyAllWindows()
        save_state({"line_x": line_x_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop})
        print("Cleanup completed, exiting...")
        sys.exit(0)

if __name__ == "__main__":
    main()