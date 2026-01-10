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
from functools import wraps
import queue as std_queue
from pathlib import Path
import zmq # ADDED: ZeroMQ for API Server Relay
import zmq # ADDED: ZeroMQ for API Server Relay

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
# Get project root (2 levels up from src/detection/)
APP_DIR = Path(__file__).resolve().parent.parent.parent
STATE_FILE = str((APP_DIR / "config" / "state_main_new.json").resolve())

# Queue untuk operasi Google Sheets yang gagal (akan di-retry saat koneksi kembali)
failed_sheet_operations = std_queue.Queue(maxsize=100)  # Limit queue size

# Circuit breaker untuk mencegah terlalu banyak retry
circuit_breaker_state = {"open": False, "last_failure": 0, "failure_count": 0}
CIRCUIT_BREAKER_THRESHOLD = 5  # Buka circuit setelah 5 failure berturut-turut
CIRCUIT_BREAKER_RESET_TIME = 30  # Reset setelah 30 detik

def check_internet_connection(timeout=2):
    """Check apakah ada koneksi internet dengan timeout lebih pendek"""
    try:
        response = requests.get("https://www.google.com", timeout=timeout)
        return response.status_code == 200
    except:
        return False

def execute_with_timeout(func, timeout=5, *args, **kwargs):
    """Execute function dengan timeout menggunakan thread - timeout lebih pendek"""
    result_queue = std_queue.Queue()
    exception_queue = std_queue.Queue()
    thread_done = threading.Event()
    
    def _execute():
        try:
            result = func(*args, **kwargs)
            result_queue.put(result)
        except Exception as e:
            exception_queue.put(e)
        finally:
            thread_done.set()
    
    thread = threading.Thread(target=_execute, daemon=True)
    thread.start()
    
    # Wait dengan timeout yang lebih pendek
    if not thread_done.wait(timeout=timeout):
        # Thread masih berjalan setelah timeout - tidak bisa dihentikan, tapi kita skip
        print(f"⚠️ Operation {func.__name__} timed out after {timeout}s - skipping")
        raise TimeoutError(f"Operation {func.__name__} timed out after {timeout}s")
    
    if not exception_queue.empty():
        raise exception_queue.get()
    
    if not result_queue.empty():
        return result_queue.get()
    
    return None

def check_circuit_breaker():
    """Check apakah circuit breaker terbuka"""
    global circuit_breaker_state
    current_time = time.time()
    
    # Reset circuit breaker jika sudah cukup lama
    if circuit_breaker_state["open"]:
        if current_time - circuit_breaker_state["last_failure"] > CIRCUIT_BREAKER_RESET_TIME:
            print("🔄 Circuit breaker reset - attempting operations again")
            circuit_breaker_state["open"] = False
            circuit_breaker_state["failure_count"] = 0
    
    return circuit_breaker_state["open"]

def record_circuit_breaker_failure():
    """Record failure untuk circuit breaker"""
    global circuit_breaker_state
    circuit_breaker_state["failure_count"] += 1
    circuit_breaker_state["last_failure"] = time.time()
    
    if circuit_breaker_state["failure_count"] >= CIRCUIT_BREAKER_THRESHOLD:
        circuit_breaker_state["open"] = True
        print(f"⚠️ Circuit breaker opened after {circuit_breaker_state['failure_count']} failures")

def record_circuit_breaker_success():
    """Record success untuk reset circuit breaker"""
    global circuit_breaker_state
    if circuit_breaker_state["failure_count"] > 0:
        circuit_breaker_state["failure_count"] = 0
        circuit_breaker_state["open"] = False

def retry_failed_sheet_operations(ws, max_age=300, max_retries_per_cycle=3):
    """Retry operasi Google Sheets yang gagal sebelumnya (max 5 menit) - lebih agresif"""
    if ws is None or check_circuit_breaker():
        return []
    
    retried = []
    temp_queue = std_queue.Queue()
    retry_count = 0
    
    # Pindahkan beberapa item ke temp queue (limit untuk tidak overload)
    while not failed_sheet_operations.empty() and retry_count < max_retries_per_cycle:
        try:
            temp_queue.put(failed_sheet_operations.get_nowait())
            retry_count += 1
        except std_queue.Empty:
            break
    
    # Process dan retry
    success_count = 0
    while not temp_queue.empty():
        try:
            func, args, kwargs, fail_time = temp_queue.get_nowait()
            
            # Skip jika sudah terlalu lama (lebih dari max_age detik)
            if time.time() - fail_time > max_age:
                print(f"Skipping old failed operation: {func.__name__} (age: {time.time() - fail_time:.1f}s)")
                continue
            
            # Coba retry dengan timeout lebih pendek
            try:
                print(f"🔄 Retrying failed operation: {func.__name__}")
                execute_with_timeout(func, timeout=5, *args, **kwargs)
                print(f"✅ Successfully retried: {func.__name__}")
                retried.append(func.__name__)
                success_count += 1
                record_circuit_breaker_success()
            except Exception as e:
                # Masih gagal, masukkan kembali ke queue (dengan timestamp baru)
                print(f"❌ Retry still failed for {func.__name__}: {e}")
                try:
                    failed_sheet_operations.put_nowait((func, args, kwargs, time.time()))
                except:
                    pass  # Queue penuh, skip
                record_circuit_breaker_failure()
        except std_queue.Empty:
            break
    
    if success_count > 0:
        print(f"✅ Retried {success_count} operations successfully")
    
    return retried

def send_telegram_message(message, bot_token, chat_id, max_retries=3):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    formatted_message = f"*{timestamp}* {message}"
    payload = {"chat_id": chat_id, "text": formatted_message, "parse_mode": "Markdown"}
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, json=payload, timeout=5)  # Reduced timeout untuk non-blocking
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

def send_telegram_message_async(message, bot_token, chat_id, max_retries=3):
    """Non-blocking version - runs in background thread"""
    def _send():
        send_telegram_message(message, bot_token, chat_id, max_retries)
    thread = threading.Thread(target=_send, daemon=True)
    thread.start()
    return thread

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {"line_x": 0.5, "line_y": 0.5, "mid_gap": 0.04, "roi_x": 0.5, "roi_width": 0.2, "roi_y": 0.5, "roi_height": 1.0, "detection_mode": "vertical"}

def save_state(state):
    # Convert values to native Python types (float/str) to avoid numpy/tensor serialization issues
    serializable_state = {}
    for k, v in state.items():
        if hasattr(v, 'item'):  # For numpy/tensor types
            serializable_state[k] = v.item()
        else:
            serializable_state[k] = v
            
    with open(STATE_FILE, 'w') as f:
        json.dump(serializable_state, f)

def open_rtsp_robust(source, timeout_seconds=15):
    """Open RTSP connection dengan optimasi timeout dan retry yang lebih baik"""
    protocols = ["tcp", "udp"]
    max_attempts = 15  # Tambah retry attempts
    
    for attempt in range(max_attempts):
        for proto in protocols:
            print(f"Attempt {attempt+1}/{max_attempts}: Connecting RTSP with {proto}...")
            
            # Optimasi FFmpeg options untuk koneksi yang lebih stabil
            # stimeout: timeout untuk socket operations (microseconds)
            # rw_timeout: timeout untuk read/write operations (microseconds)
            # max_delay: maksimum delay untuk frame (microseconds)
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
                f"rtsp_transport;{proto}|"
                f"stimeout;5000000|"  # 5 detik socket timeout (dikurangi dari 10 detik)
                f"rw_timeout;5000000|"  # 5 detik read/write timeout
                f"max_delay;500000|"  # 0.5 detik max delay
                f"fflags;nobuffer|"  # No buffering untuk real-time
                f"fpsprobesize;0|"  # Skip FPS probe untuk faster connection
                f"analyzeduration;0|"  # Skip analysis untuk faster connection
                f"rtsp_flags;prefer_tcp"  # Prefer TCP untuk stability
            )
            
            try:
                cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
                
                # Test connection dengan timeout
                start_time = time.time()
                connection_ok = False
                
                # Coba baca frame dengan timeout
                while time.time() - start_time < timeout_seconds:
                    if cap.isOpened():
                        # Coba grab frame (non-blocking check)
                        grabbed = cap.grab()
                        if grabbed:
                            # Jika berhasil grab, coba retrieve untuk memastikan frame valid
                            ret, test_frame = cap.retrieve()
                            if ret and test_frame is not None and test_frame.size > 0:
                                connection_ok = True
                                break
                    time.sleep(0.5)  # Check setiap 0.5 detik
                
                if connection_ok:
                    # Set properties setelah connection berhasil
                    cap.set(cv2.CAP_PROP_FPS, 25)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 3)  # Reduced buffer untuk mengurangi latency
                    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'H264'))
                    
                    print(f"✅ RTSP connected using {proto} at 25 FPS")
                    return cap
                else:
                    print(f"❌ RTSP connection timeout with {proto}")
                    if cap.isOpened():
                        cap.release()
            except Exception as e:
                print(f"❌ Error connecting RTSP with {proto}: {e}")
                try:
                    if 'cap' in locals() and cap.isOpened():
                        cap.release()
                except:
                    pass
            
            time.sleep(1)  # Delay antar attempt (dikurangi dari 2 detik)
    
    print("❌ Failed to connect to RTSP after multiple attempts")
    return None

def get_worksheet(gc, sheet_id, worksheet_name):
    sheet = gc.open_by_key(sheet_id)
    try:
        ws = sheet.worksheet(worksheet_name)
    except gspread.exceptions.WorksheetNotFound:
        ws = sheet.add_worksheet(title=worksheet_name, rows=10000, cols=10)
        ws.append_row(["Plat", "Tanggal", "Jam Datang", "Jam Selesai", "Loading", "Rehab", "Kloter"])
    return ws

def get_worksheet_safe(gc, sheet_id, worksheet_name, max_retries=3):
    """Get worksheet dengan retry dan timeout"""
    for attempt in range(max_retries):
        try:
            return execute_with_timeout(get_worksheet, timeout=10, gc=gc, sheet_id=sheet_id, worksheet_name=worksheet_name)
        except (TimeoutError, requests.exceptions.RequestException, 
                gspread.exceptions.APIError, Exception) as e:
            print(f"Error getting worksheet (attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise
    return None

def find_row_for_plate(ws, plate, today_str):
    if ws is None:
        return None
    try:
        rows = execute_with_timeout(ws.get_all_values, timeout=10)
        if rows:
            for i, row in enumerate(rows[1:], start=2):
                if len(row) >= 4 and row[0] == plate and row[1] == today_str and not row[3]:
                    return i
    except Exception as e:
        print(f"Error in find_row_for_plate: {e}")
        # Simpan untuk retry nanti
        try:
            failed_sheet_operations.put((find_row_for_plate, (ws, plate, today_str), {}, time.time()))
        except:
            pass  # Queue mungkin penuh, skip
    return None

def calculate_kloter(ws, plate, today_str):
    if ws is None:
        return 1
    try:
        rows = execute_with_timeout(ws.get_all_values, timeout=10)
        if rows:
            count = 0
            for row in rows[1:]:  # Skip header
                if len(row) >= 2 and row[0] == plate and row[1] == today_str:
                    count += 1
            print(f"Found {count} existing rows for {plate} on {today_str}")
            return count + 1
        return 1
    except Exception as e:
        print(f"Error calculating kloter for {plate}: {e}")
        # Simpan untuk retry nanti
        try:
            failed_sheet_operations.put((calculate_kloter, (ws, plate, today_str), {}, time.time()))
        except:
            pass  # Queue mungkin penuh, skip
        return 1  # Default to 1 if error

def finalize_sheet(ws, row_idx, loading, rehab, finish_time_str=None):
    if ws is None:
        print("Warning: Cannot finalize sheet - worksheet is None")
        return
    try:
        if finish_time_str is None:
            finish_time_str = datetime.datetime.now().strftime("%H:%M:%S")
            
        execute_with_timeout(ws.update_cell, timeout=10, row=row_idx, col=4, value=finish_time_str)
        execute_with_timeout(ws.update_cell, timeout=10, row=row_idx, col=5, value=loading)
        execute_with_timeout(ws.update_cell, timeout=10, row=row_idx, col=6, value=rehab)
    except Exception as e:
        print(f"Error in finalize_sheet: {e}")
        # Simpan untuk retry nanti
        try:
            failed_sheet_operations.put((finalize_sheet, (ws, row_idx, loading, rehab, finish_time_str), {}, time.time()))
        except:
            pass  # Queue mungkin penuh, skip
        raise

def append_row_safe(ws, row_data):
    """Append row dengan timeout dan error handling"""
    if ws is None:
        print("Warning: Cannot append row - worksheet is None")
        return
    try:
        execute_with_timeout(ws.append_row, timeout=10, values=row_data)
    except Exception as e:
        print(f"Error appending row: {e}")
        # Simpan untuk retry nanti
        try:
            failed_sheet_operations.put((append_row_safe, (ws, row_data), {}, time.time()))
        except:
            pass  # Queue mungkin penuh, skip
        raise

def finalize_sheet_async(ws, row_idx, loading, rehab, finish_time_str=None):
    """Non-blocking version - runs in background thread"""
    def _finalize():
        try:
            finalize_sheet(ws, row_idx, loading, rehab, finish_time_str)
        except Exception as e:
            print(f"Error in async finalize_sheet: {e}")
    thread = threading.Thread(target=_finalize, daemon=True)
    thread.start()
    return thread

def scan_qr_from_frame(frame):
    qr_detector = cv2.QRCodeDetector()
    try:
        # Preprocessing untuk meningkatkan deteksi QR
        # Convert ke grayscale jika belum
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame
        
        # Enhance contrast dengan CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Coba deteksi dengan frame asli
        retval, decoded_info, points, _ = qr_detector.detectAndDecodeMulti(frame)
        if retval:
            for info in decoded_info:
                if info:
                    return info.strip()
        else:
            decoded_info, points, _ = qr_detector.detectAndDecode(frame)
            if decoded_info:
                return decoded_info.strip()
        
        # Jika tidak terdeteksi, coba dengan enhanced frame
        retval, decoded_info, points, _ = qr_detector.detectAndDecodeMulti(enhanced)
        if retval:
            for info in decoded_info:
                if info:
                    return info.strip()
        else:
            decoded_info, points, _ = qr_detector.detectAndDecode(enhanced)
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
        time.sleep(0.1)  # Scan lebih sering (dari 0.3 ke 0.1 detik)


# === BACKGROUND WORKER INFRASTRUCTURE ===

class AppState:
    """Shared state container for background workers"""
    def __init__(self):
        self._lock = threading.Lock()
        self._ws = None
        self._has_internet = False
        self._gc = None
        self._creds = None
        self._sheet_id = None
        self._worksheet_name = None

    def update_ws(self, new_ws):
        with self._lock:
            self._ws = new_ws

    def get_ws(self):
        with self._lock:
            return self._ws
    
    def set_internet_status(self, status):
        # Atomic boolean update (GIL ensures thread safety for bool assignment, but explicit is better)
        self._has_internet = status
        
    def get_internet_status(self):
        return self._has_internet
        
    def set_sheet_config(self, gc, sheet_id, worksheet_name):
        with self._lock:
            self._gc = gc
            self._sheet_id = sheet_id
            self._worksheet_name = worksheet_name
            
    def get_sheet_config(self):
        with self._lock:
            return self._gc, self._sheet_id, self._worksheet_name

def internet_checker_worker(app_state, interval=10, stop_event=None):
    """Background worker to check internet connection periodically"""
    print("✅ Background Internet Checker started")
    while not stop_event.is_set():
        try:
            status = check_internet_connection(timeout=3)
            app_state.set_internet_status(status)
        except Exception as e:
            print(f"Error in internet checker: {e}")
            app_state.set_internet_status(False)
            
        # Sleep in small chunks to allow quick shutdown
        for _ in range(int(interval * 2)):
            if stop_event.is_set():
                break
            time.sleep(0.5)

def sheet_retry_worker(app_state, interval=10, stop_event=None):
    """Background worker to retry failed sheet operations periodically"""
    print("✅ Background Sheet Retry Worker started")
    while not stop_event.is_set():
        try:
            # Check internet status first from shared state (fast)
            if app_state.get_internet_status():
                ws = app_state.get_ws()
                if ws:
                    # Retry operations if queue is not empty
                    if not failed_sheet_operations.empty():
                        retried = retry_failed_sheet_operations(ws)
                        if retried:
                            print(f"✅ Background retry success: {retried}")
                else:
                    # If ws is None but we have internet, maybe we need to reconnect?
                    # This is handled by the main loop usually, but we could try to get config
                    pass
        except Exception as e:
            print(f"Error in sheet retry worker: {e}")
            
        # Sleep in small chunks
        for _ in range(int(interval * 2)):
            if stop_event.is_set():
                break
            time.sleep(0.5)

# Removed start_qr_standby function - main_v2 doesn't use QR standby


def main():
    parser = argparse.ArgumentParser(description="Icetube Main Detector with QR Scanning (Vertical Line - FIXED CROSSING LOGIC)")
    parser.add_argument("--source", required=True, help="RTSP source")
    parser.add_argument("--model", required=True, help="YOLO model path")
    parser.add_argument("--imgsz", default=320, type=int, help="YOLO image size")
    parser.add_argument("--conf", default=0.35, type=float, help="YOLO confidence (diturunkan untuk mendeteksi objek cepat/blur)")
    parser.add_argument("--iou", default=0.35, type=float, help="YOLO IoU (ditingkatkan untuk mengurangi duplicate detection)")
    parser.add_argument("--width", default=960, type=int, help="Display width")
    parser.add_argument("--line_x", default=0.5, type=float, help="Initial line_x position (horizontal)")
    parser.add_argument("--line_y", default=0.5, type=float, help="Initial line_y position (vertical)")
    parser.add_argument("--mid_gap", default=0.06, type=float, help="Initial mid_gap (wider = less jitter double count)")
    parser.add_argument("--min_area", default=0.01, type=float, help="Minimum box area proportion (0-1) to count")
    parser.add_argument("--roi_x_prop", default=0.5, type=float, help="ROI center x proportion (0-1)")
    parser.add_argument("--roi_width_prop", default=0.2, type=float, help="ROI width proportion (0-1)")
    parser.add_argument("--roi_y_prop", default=0.5, type=float, help="ROI center y proportion (0-1)")
    parser.add_argument("--roi_height_prop", default=1.0, type=float, help="ROI height proportion (0-1)")
    # Removed --idle_secs - main_v2 doesn't exit on idle
    parser.add_argument("--sheet_id", required=True, help="Google Sheet ID")
    parser.add_argument("--creds", required=True, help="Credentials JSON path")
    parser.add_argument("--worksheet", required=True, help="Worksheet name")
    parser.add_argument("--plate", required=True, help="Initial plate from QR standby")
    parser.add_argument("--notify_token", required=True, help="Telegram bot token for driver notification")
    parser.add_argument("--notify_chat_id", required=True, help="Telegram chat ID for driver notification")
    parser.add_argument("--test_token", default=None, help="Telegram bot token for testing notification")
    parser.add_argument("--test_chat_id", default=None, help="Telegram chat ID for testing notification")
    parser.add_argument("--half", action='store_true', help="Use FP16 half-precision inference for GPU speed up")
    parser.add_argument("--system_token", default="7990876346:AAEm4bpPB9fKiVtC5il4dFWEANc1didd6jk", help="Telegram bot token for system notification")
    parser.add_argument("--system_chat_id", default="7678774830", help="Telegram chat ID for system notification")
    args = parser.parse_args()

    system_token = args.system_token
    system_chat_id = args.system_chat_id

    current_plate = args.plate
    last_scan_time = time.time()
    scan_cooldown = 60
    last_qr_scanned = None  # Untuk mencegah scan QR yang sama berulang kali
    qr_scan_cooldown = 60  # 1 menit cooldown untuk scan QR yang sama (konfirmasi selesai)
    qr_first_scan_time = {}  # {qr_data: timestamp} - waktu scan pertama untuk setiap QR
    
    # ✅ Debug logging untuk parameter
    print(f"🔍 DEBUG: Starting main_v2.py")
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
    line_x_prop = state.get("line_x", args.line_x)
    line_y_prop = state.get("line_y", args.line_y)
    mid_gap_prop = state.get("mid_gap", args.mid_gap)
    roi_x_prop = state.get("roi_x", args.roi_x_prop)
    roi_width_prop = state.get("roi_width", args.roi_width_prop)
    roi_y_prop = state.get("roi_y", args.roi_y_prop)
    roi_height_prop = state.get("roi_height", args.roi_height_prop)
    detection_mode = state.get("detection_mode", "vertical")  # vertical or horizontal

    # Deteksi apakah menggunakan TensorRT engine file
    is_tensorrt = args.model.lower().endswith('.engine')
    
    # Cek apakah ada alternatif model (.pt atau .onnx) jika engine gagal
    model_alt_pt = args.model.replace('.engine', '.pt')
    model_alt_onnx = args.model.replace('.engine', '.onnx')
    has_alt_pt = os.path.exists(model_alt_pt) if is_tensorrt else False
    has_alt_onnx = os.path.exists(model_alt_onnx) if is_tensorrt else False
    
    # TensorRT engine - ukuran input fixed sesuai saat engine dibuat
    # Catatan: Engine saat ini dibuat dengan imgsz=640, tapi kode dioptimasi untuk imgsz=320
    # Untuk performa optimal, rebuild engine dengan imgsz=320 menggunakan rebuild_engine.py
    if is_tensorrt:
        print(f"Using TensorRT engine: {args.model}")
        device = 'cuda'  # TensorRT hanya berjalan di CUDA
        # Engine saat ini mungkin dibuat dengan imgsz=640, tapi kita gunakan imgsz dari args
        # Jika engine dibuat dengan imgsz berbeda, akan error - perlu rebuild engine
        if args.imgsz == 320:
            print(f"Info: Using imgsz=320 (optimized). Pastikan engine dibuat dengan imgsz=320")
        else:
            print(f"Info: Using imgsz={args.imgsz}. Pastikan engine dibuat dengan imgsz yang sama")
    else:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {device}")
    
    model = None
    actual_model_path = args.model
    
    try:
        print(f"Loading model from: {args.model}")
        print(f"File exists: {os.path.exists(args.model)}")
        if not os.path.exists(args.model):
            raise FileNotFoundError(f"Model file not found: {args.model}")
        
        print("Initializing YOLO model...")
        model = YOLO(args.model)
        print("YOLO model initialized")
        
        # Verifikasi model ter-load dengan benar
        if model is None:
            raise RuntimeError("Model gagal diinisialisasi - model is None")
        
        # Untuk TensorRT engine, skip operasi PyTorch yang tidak diperlukan
        if not is_tensorrt:
            print(f"Moving model to device: {device}")
            model.to(device)
            if device == 'cuda':
                torch.backends.cudnn.benchmark = True
                if args.half:
                    print("Converting to half precision...")
                    model.half()
        else:
            print("TensorRT engine detected - skipping PyTorch operations")
            print("TensorRT engine loaded - using optimized inference")
        
        # Test model dengan dummy inference untuk memastikan model berfungsi
        try:
            print("Testing model dengan dummy input...")
            dummy_input = np.zeros((640, 640, 3), dtype=np.uint8)
            test_result = model.predict(dummy_input, verbose=False)
            print("✅ Model test berhasil!")
        except Exception as test_error:
            print(f"⚠️ Model test gagal: {test_error}")
            print("Ini mungkin normal untuk TensorRT engine, melanjutkan...")
        
        print("Model loaded successfully!")
    except FileNotFoundError as e:
        error_msg = f"Model file not found: {args.model}"
        print(f"ERROR: {error_msg}")
        print(f"Full error: {e}")
        import traceback
        traceback.print_exc()
        send_telegram_message(f"⚠️ Model file tidak ditemukan: {args.model}", system_token, system_chat_id)
        if args.test_token and args.test_chat_id:
            send_telegram_message(f"⚠️ Model file tidak ditemukan: {args.model}", args.test_token, args.test_chat_id)
        sys.exit(1)
    except Exception as e:
        error_msg = f"Error loading model: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        traceback.print_exc()
        
        # Deteksi TensorRT version mismatch - coba fallback ke model alternatif
        if "Serialization" in str(e) or "version" in str(e).lower() or "TensorRT" in str(e):
            print(f"\n⚠️ TensorRT Version Mismatch terdeteksi!")
            print(f"Engine file tidak kompatibel dengan TensorRT versi saat ini.")
            print(f"Mencoba fallback ke model alternatif...\n")
            
            # Coba fallback ke model alternatif
            fallback_success = False
            if has_alt_pt:
                try:
                    print(f"🔄 Mencoba menggunakan model alternatif: {model_alt_pt}")
                    model = YOLO(model_alt_pt)
                    model.to(device)
                    if device == 'cuda':
                        torch.backends.cudnn.benchmark = True
                        if args.half:
                            model.half()
                    actual_model_path = model_alt_pt
                    is_tensorrt = False  # Update flag karena sekarang pakai .pt
                    print(f"✅ Berhasil menggunakan model alternatif: {model_alt_pt}")
                    fallback_success = True
                    send_telegram_message(
                        f"⚠️ TensorRT engine tidak kompatibel.\n"
                        f"✅ Menggunakan model alternatif: {os.path.basename(model_alt_pt)}",
                        args.notify_token, args.notify_chat_id
                    )
                except Exception as fallback_error:
                    print(f"❌ Gagal menggunakan model alternatif .pt: {fallback_error}")
            
            if not fallback_success and has_alt_onnx:
                try:
                    print(f"🔄 Mencoba menggunakan model alternatif: {model_alt_onnx}")
                    model = YOLO(model_alt_onnx)
                    model.to(device)
                    if device == 'cuda':
                        torch.backends.cudnn.benchmark = True
                    actual_model_path = model_alt_onnx
                    is_tensorrt = False  # Update flag karena sekarang pakai .onnx
                    print(f"✅ Berhasil menggunakan model alternatif: {model_alt_onnx}")
                    fallback_success = True
                    send_telegram_message(
                        f"⚠️ TensorRT engine tidak kompatibel.\n"
                        f"✅ Menggunakan model alternatif: {os.path.basename(model_alt_onnx)}",
                        args.notify_token, args.notify_chat_id
                    )
                except Exception as fallback_error:
                    print(f"❌ Gagal menggunakan model alternatif .onnx: {fallback_error}")
            
            if not fallback_success:
                # Tidak ada alternatif yang berhasil
                detailed_msg = (
                    "⚠️ TensorRT Version Mismatch!\n\n"
                    f"Engine file dibuat dengan TensorRT versi berbeda.\n"
                    f"Error: {error_msg[:300]}\n\n"
                    "Solusi:\n"
                    "1. Rebuild engine file dengan TensorRT versi yang sama\n"
                    "2. Atau gunakan model .pt/.onnx sebagai alternatif\n"
                    "3. Pastikan TensorRT version match dengan engine file"
                )
                print(detailed_msg)
                send_telegram_message(detailed_msg[:500], args.notify_token, args.notify_chat_id)
                if args.test_token and args.test_chat_id:
                    send_telegram_message(detailed_msg[:500], args.test_token, args.test_chat_id)
                sys.exit(1)
            else:
                # Fallback berhasil, lanjutkan dengan model alternatif
                print("✅ Fallback berhasil, melanjutkan dengan model alternatif...")
        else:
            # Error lain selain TensorRT version mismatch
            send_telegram_message(f"⚠️ Error loading model: {error_msg[:200]}", system_token, system_chat_id)
            if args.test_token and args.test_chat_id:
                send_telegram_message(f"⚠️ Error loading model: {error_msg[:200]}", args.test_token, args.test_chat_id)
            sys.exit(1)
    
    # Pastikan model sudah ter-load sebelum melanjutkan
    if model is None:
        print("ERROR: Model tidak berhasil dimuat!")
        sys.exit(1)

    cap = open_rtsp_robust(args.source)
    if not cap:
        send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", system_token, system_chat_id)
        if args.test_token and args.test_chat_id:
            send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.test_token, args.test_chat_id)
        sys.exit(1)

    ret, frame = cap.read()
    if not ret:
        cap.release()
        send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", system_token, system_chat_id)
        if args.test_token and args.test_chat_id:
            send_telegram_message(f"⚠️ Terjadi masalah. Silakan coba scan QR lagi atau hubungi petugas.", args.test_token, args.test_chat_id)
        sys.exit(1)
    h, w = frame.shape[:2]
    display_w = args.width
    display_h = int(display_w * h / w)
    
    # Buat window OpenCV
    window_name = "Icetube Main V2 (No QR Standby)"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, display_w, display_h)
    print(f"Window created: {window_name} ({display_w}x{display_h})")


    # Variabel untuk Google Sheets connection
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    gc = None
    ws = None
    
    # Initialize Shared AppState
    app_state = AppState()
    
    # Start Background Workers
    worker_stop_event = threading.Event()
    
    # --- ZMQ SETUP (API Relay) ---
    print("🚀 Initializing ZMQ Publisher...")
    try:
        zmq_context = zmq.Context()
        zmq_socket = zmq_context.socket(zmq.PUB)
        zmq_socket.bind("tcp://*:5555") 
        print("🚀 ZMQ Stream Publisher active on tcp://*:5555")
    except Exception as e:
        print(f"❌ Failed to bind ZMQ port 5555: {e}")
        zmq_socket = None
    
    # Internet Checker Thread
    internet_thread = threading.Thread(target=internet_checker_worker, args=(app_state, 10, worker_stop_event))
    internet_thread.daemon = True
    internet_thread.start()
    
    # Sheet Retry Thread
    retry_thread = threading.Thread(target=sheet_retry_worker, args=(app_state, 10, worker_stop_event))
    retry_thread.daemon = True
    retry_thread.start()

    
    try:
        print("Connecting to Google Sheets...")
        if not os.path.exists(args.creds):
            raise FileNotFoundError(f"Credentials file not found: {args.creds}")
        creds = ServiceAccountCredentials.from_json_keyfile_name(args.creds, scope)
        gc = gspread.authorize(creds)
        ws = get_worksheet_safe(gc, args.sheet_id, args.worksheet)
        # Update shared state
        app_state.update_ws(ws)
        app_state.set_sheet_config(gc, args.sheet_id, args.worksheet)
        app_state.set_internet_status(True) # We just connected, so internet is OK
        print("Google Sheets connected successfully!")
    except FileNotFoundError as e:
        error_msg = f"Credentials file not found: {args.creds}"
        print(f"ERROR: {error_msg}")
        import traceback
        traceback.print_exc()
        send_telegram_message(f"⚠️ Credentials file tidak ditemukan: {args.creds}", system_token, system_chat_id)
        sys.exit(1)
    except Exception as e:
        error_msg = f"Error connecting to Google Sheets: {str(e)}"
        print(f"ERROR: {error_msg}")
        print("⚠️ Akan mencoba reconnect secara otomatis saat koneksi tersedia...")
        import traceback
        traceback.print_exc()
        send_telegram_message(f"⚠️ Error connecting to Google Sheets: {error_msg[:200]}. Akan reconnect otomatis.", system_token, system_chat_id)
        # Jangan exit, biarkan reconnect otomatis

    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    row_idx = None
    kloter = None
    
    # UNKNOWN tidak dibuat row di awal - hanya dibuat jika ada count > 0
    # Jika plate bukan UNKNOWN, cari atau buat row
    if current_plate != "UNKNOWN" and ws is not None:
        row_idx = find_row_for_plate(ws, current_plate, today_str)
        if row_idx is None:
            kloter = calculate_kloter(ws, current_plate, today_str)
            now_str = datetime.datetime.now().strftime("%H:%M:%S")
            try:
                append_row_safe(ws, [current_plate, today_str, now_str, "", 0, 0, kloter])
                rows = execute_with_timeout(ws.get_all_values, timeout=10)
                row_idx = len(rows) if rows else None
            except Exception as e:
                print(f"Error creating initial row: {e}")
                row_idx = None
    else:
        row_idx = None  # UNKNOWN tidak punya row sampai ada count > 0

    frame_queue = Queue(maxsize=1)
    qr_queue = Queue(maxsize=1)
    stop_event = threading.Event()

    qr_thread = threading.Thread(target=qr_scanner, args=(frame_queue, qr_queue, stop_event))
    qr_thread.daemon = True
    qr_thread.start()

    capture_queue = Queue(maxsize=30)  # Increased buffer untuk mengurangi frame skip

    def capture_thread(cap, capture_queue, stop_event, source_url):
        """Capture thread dengan auto-reconnect yang lebih robust"""
        last_successful_read = time.time()
        consecutive_failures = 0
        max_consecutive_failures = 5  # Reduced untuk reconnect lebih cepat
        reconnect_attempts = 0
        max_reconnect_attempts = 999  # Near-infinite retries to prevent auto-shutdown
        read_timeout = 3.0  # Timeout untuk cap.read() (detik)
        
        current_cap = cap
        
        while not stop_event.is_set():
            try:
                # Baca frame dengan timeout mechanism
                frame_read = False
                frame = None
                
                # Gunakan grab() + retrieve() untuk lebih reliable
                start_read = time.time()
                grabbed = False
                
                # Try grab dengan timeout
                while time.time() - start_read < read_timeout:
                    if current_cap.isOpened():
                        grabbed = current_cap.grab()
                        if grabbed:
                            break
                    time.sleep(0.1)
                
                if grabbed:
                    ret, frame = current_cap.retrieve()
                    if ret and frame is not None and frame.size > 0:
                        frame_read = True
                
                if frame_read:
                    # Drop oldest frame jika queue penuh (prioritaskan frame terbaru)
                    if capture_queue.full():
                        try:
                            capture_queue.get_nowait()  # Drop frame tertua
                        except QueueEmpty:
                            pass
                    
                    # Put frame baru (non-blocking)
                    try:
                        capture_queue.put_nowait(frame)
                    except:
                        pass  # Skip jika masih penuh
                    
                    last_successful_read = time.time()
                    consecutive_failures = 0
                    reconnect_attempts = 0  # Reset reconnect attempts setelah sukses
                else:
                    consecutive_failures += 1
                    print(f"⚠️ RTSP read failed (consecutive failures: {consecutive_failures})")
                    
                    # Jika terlalu banyak failure, coba reconnect
                    if consecutive_failures >= max_consecutive_failures:
                        print(f"🔄 Attempting RTSP reconnect (attempt {reconnect_attempts + 1}/{max_reconnect_attempts})...")
                        
                        # Release old connection
                        try:
                            if current_cap.isOpened():
                                current_cap.release()
                        except:
                            pass
                        
                        # Coba reconnect
                        reconnect_attempts += 1
                        if reconnect_attempts <= max_reconnect_attempts:
                            time.sleep(2)  # Tunggu sebelum reconnect
                            new_cap = open_rtsp_robust(source_url, timeout_seconds=10)
                            if new_cap and new_cap.isOpened():
                                print("✅ RTSP reconnected successfully!")
                                current_cap = new_cap
                                consecutive_failures = 0
                                reconnect_attempts = 0
                            else:
                                print(f"❌ RTSP reconnect failed (attempt {reconnect_attempts})")
                                time.sleep(3)  # Tunggu lebih lama sebelum retry berikutnya
                        else:
                            print("⚠️ Max reconnect attempts reached, resetting counter and retrying...")
                            reconnect_attempts = 0  # Reset instead of break
                            time.sleep(10)  # Wait longer before next cycle
                    else:
                        time.sleep(0.2)  # Delay untuk recovery
                
                # Heartbeat check - reconnect jika tidak ada frame > 20 detik
                if time.time() - last_successful_read > 20:
                    print(f"⚠️ No frames received for {int(time.time() - last_successful_read)} seconds, attempting reconnect...")
                    try:
                        if current_cap.isOpened():
                            current_cap.release()
                    except:
                        pass
                    
                    reconnect_attempts += 1
                    if reconnect_attempts <= max_reconnect_attempts:
                        time.sleep(2)
                        new_cap = open_rtsp_robust(source_url, timeout_seconds=10)
                        if new_cap and new_cap.isOpened():
                            print("✅ RTSP reconnected after timeout!")
                            current_cap = new_cap
                            last_successful_read = time.time()
                            consecutive_failures = 0
                            reconnect_attempts = 0
                        else:
                            print(f"❌ RTSP reconnect failed after timeout")
                    else:
                        print("⚠️ Max reconnect attempts reached after timeout, resetting counter...")
                        reconnect_attempts = 0  # Reset instead of break
                        time.sleep(10)
                        
            except Exception as e:
                print(f"❌ Error in capture thread: {e}")
                consecutive_failures += 1
                time.sleep(1)
                
                # Coba reconnect jika error terus menerus
                if consecutive_failures >= max_consecutive_failures:
                    try:
                        if current_cap.isOpened():
                            current_cap.release()
                    except:
                        pass
                    
                    reconnect_attempts += 1
                    if reconnect_attempts <= max_reconnect_attempts:
                        time.sleep(2)
                        new_cap = open_rtsp_robust(source_url, timeout_seconds=10)
                        if new_cap and new_cap.isOpened():
                            print("✅ RTSP reconnected after error!")
                            current_cap = new_cap
                            consecutive_failures = 0
                            reconnect_attempts = 0
                        else:
                            print(f"❌ RTSP reconnect failed after error")
                    else:
                        print("⚠️ Max reconnect attempts reached after error, resetting counter...")
                        reconnect_attempts = 0  # Reset instead of break
                        time.sleep(10)
        
        # Cleanup
        try:
            worker_stop_event.set() # Stop background workers
            if current_cap.isOpened():
                current_cap.release()
        except:
            pass
        print("Capture thread stopped")

    capture_stop_event = threading.Event()
    capture_thread_obj = threading.Thread(target=capture_thread, args=(cap, capture_queue, capture_stop_event, args.source))
    capture_thread_obj.daemon = True
    capture_thread_obj.start()

    loading = 0
    rehab = 0
    total = 0
    last_activity = time.time()
    last_count_time = 0  # Global cooldown timer (untuk logging)
    blacklisted_ids = {}
    prev_time = time.time()
    fps = 0
    loading_anim = False
    rehab_anim = False
    anim_start_time = 0
    anim_duration = 1.0
    
    # Health check variables
    last_frame_received = time.time()
    
    # Timer untuk kirim data ke Google Sheets (10 menit jika count > 0)
    sheet_timer_start = None  # Waktu mulai timer (hanya jika count > 0)
    SHEET_TIMER_DURATION = 600  # 10 menit dalam detik

    debug_low_thresh = False
    current_conf = args.conf
    current_iou = args.iou

    # === LOGIKA SEDERHANA: TANPA TRACK BACK, HANYA BAND-BASED DETECTION ===
    track_band_state = {}  # {track_id: 'left' or 'right'} - posisi band saat ini
    
    # === ANTI DOUBLE COUNT SYSTEM (Hybrid Approach) ===
    # Position history per track_id untuk prevent double count pada track_id yang sama
    last_crossing_positions = {}  # {track_id: (x_position, timestamp)}
    
    # Konstanta cooldown
    GLOBAL_COOLDOWN = 0.2  # Cooldown global ringan (0.2s) untuk extreme case
    INDIVIDUAL_COOLDOWN = 2.0  # Cooldown per track_id (2.0s) - WAJIB
    MIN_CROSSING_DISTANCE = 30  # Minimum jarak pixel untuk prevent double count same track_id
    MIN_CROSSING_TIME = 1.5  # Minimum waktu untuk prevent double count same track_id
    POSITION_HISTORY_TTL = 5.0  # Time-to-live untuk position history (detik)
    
    # Persistence Check untuk mengurangi False Positives (Ghost Detection)
    track_history = {}  # {track_id: frames_seen_count}
    track_last_seen = {} # {track_id: timestamp} - ADDED for memory cleanup
    MIN_PERSISTENCE = 1  # Diubah ke 1 agar objek cepat (hanya muncul 1-2 frame) tetap terhitung

    frame_count = 0
    
    # Variabel untuk tracking koneksi dan auto-reconnect
    last_internet_check = time.time()
    internet_check_interval = 30  # Check setiap 30 detik
    last_sheet_retry = time.time()
    sheet_retry_interval = 10  # Retry setiap 10 detik
    sheet_reconnect_attempts = 0
    max_sheet_reconnect_attempts = 5
    sheet_reconnect_attempts = 0
    max_sheet_reconnect_attempts = 5
    last_sheet_error = None
    
    # Smart QR Logic State
    last_successful_scan_time = 0
    last_count_activity_time = 0
    QR_SCAN_COOLDOWN = 20  # 20 seconds pause
    
    # Debug: pastikan window sudah dibuat
    print(f"Starting main loop... Window: {window_name}")

    try:
        # LOGGING SETUP
        with open("startup_log.txt", "w") as f:
            f.write(f"{datetime.datetime.now()}: Main loop started\n")
            
        while True:
            # Removed FPS limit logic
            try:
                # Check koneksi internet secara berkala dan auto-reconnect Google Sheets
                current_time = time.time()
                # Update tanggal setiap loop agar pergantian hari terdeteksi
                today_str = datetime.datetime.now().strftime("%Y-%m-%d")
                
                # Check internet status from shared state (NON-BLOCKING)
                # Worker updates this variable in background
                has_internet = app_state.get_internet_status()
                
                # Auto-reconnect logic (only if we know internet is UP)
                if has_internet and ws is None and gc is not None:
                     # Throttled reconnect attempt (don't spam even if internet is up)
                     if current_time - last_sheet_retry > sheet_retry_interval:
                        print("Internet OK, attempting to reconnect Google Sheets...")
                        try:
                            # Reconnect logic runs in main thread but ONLY when internet is confirmed UP
                            # and we don't have a worksheet. This might still block briefly but only when reconnecting.
                            # Ideally this should also be async but for now this is better than checking internet every loop.
                            ws = get_worksheet_safe(gc, args.sheet_id, args.worksheet)
                            app_state.update_ws(ws) # Update shared state for worker
                            print("✅ Google Sheets reconnected successfully!")
                            sheet_reconnect_attempts = 0
                            last_sheet_error = None
                            send_telegram_message_async("✅ Google Sheets terhubung kembali", args.notify_token, args.notify_chat_id)
                        except Exception as e:
                            sheet_reconnect_attempts += 1
                            last_sheet_error = str(e)
                            print(f"Failed to reconnect Google Sheets: {e}")
                        
                        last_sheet_retry = current_time # Reset timer
                
                # Retry failed sheet operations is now handled by BACKGROUND WORKER
                # We do NOT call retry_failed_sheet_operations() here anymore.

                
                if capture_queue.empty():
                    time.sleep(0.001)
                    continue
                
                # Ambil frame dari queue (tanpa catching up - selalu deteksi semua frame)
                frame = capture_queue.get_nowait()
                last_frame_received = time.time()  # Update health check
                
                # Debug: cek frame valid
                if frame is None or frame.size == 0:
                    print("Warning: Invalid frame received, skipping...")
                    continue

                frame_count += 1
                # Kirim frame ke QR scanner dengan Smart Logic
                # 1. Frequency: Every 15 frames (reduced from 5)
                # 2. Cooldown Logic:
                #    - Must be > 20s since last successful scan
                #    - IF Plate is KNOWN: Must be > 20s since last activity
                if frame_count % 15 == 0:
                    current_time = time.time()
                    
                    # Rule 1: Post-Scan Cooldown
                    cooldown_scan_ok = (current_time - last_successful_scan_time) > QR_SCAN_COOLDOWN
                    
                    # Rule 2: Activity Cooldown (Only if Plate is KNOWN)
                    if current_plate != "UNKNOWN":
                        cooldown_activity_ok = (current_time - last_count_activity_time) > QR_SCAN_COOLDOWN
                    else:
                        cooldown_activity_ok = True # Ignore activity if unknown
                        
                    if cooldown_scan_ok and cooldown_activity_ok:
                        if not frame_queue.full():
                            try:
                                frame_queue.put_nowait(frame.copy())
                            except:
                                pass  # Skip jika queue penuh
                    # else:
                        # print(f"QR Scan Skipped: ScanOK={cooldown_scan_ok}, ActOK={cooldown_activity_ok}")
                
                    # Write heartbeat every ~30 seconds (ASYNC)
                    if frame_count % 300 == 0:  # 300 frames ≈ 30 seconds at 10 FPS
                        def _write_heartbeat():
                            try:
                                with open(str((APP_DIR / "heartbeat_log.txt").resolve()), "a") as f:
                                    f.write(f"{datetime.datetime.now()} - main_v2 heartbeat\n")
                            except Exception:
                                pass
                        threading.Thread(target=_write_heartbeat, daemon=True).start()

                if not qr_queue.empty():
                    qr_data = qr_queue.get()
                    if qr_data and qr_data != "FINISH":
                        current_time = time.time()
                        # Force update date for QR processing to ensure it's fresh
                        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
                        
                        # Cek apakah QR ini sama dengan yang sedang aktif
                        if qr_data == current_plate:
                            # QR sama dengan plat aktif - cek apakah sudah lewat cooldown untuk konfirmasi selesai
                            first_scan_time = qr_first_scan_time.get(qr_data, current_time)
                            time_since_first = current_time - first_scan_time
                            
                            if time_since_first < 5:
                                # QR yang sama di-scan dalam 5 detik terakhir, abaikan (anti spam)
                                print(f"QR {qr_data} di-scan berulang, diabaikan (cooldown 5 detik)")
                                continue
                            elif time_since_first >= qr_scan_cooldown:
                                # QR sama setelah 5 menit - konfirmasi selesai
                                if row_idx is not None:
                                    try:
                                        finalize_sheet(ws, row_idx, loading, rehab, datetime.datetime.fromtimestamp(last_activity).strftime("%H:%M:%S"))
                                        send_telegram_message(f"✅ Penghitungan untuk {current_plate} selesai (QR konfirmasi selesai).", args.notify_token, args.notify_chat_id)
                                        print(f"QR {current_plate} konfirmasi selesai. Data difinalisasi: Loading={loading}, Rehab={rehab}")
                                        
                                        # Reset untuk plat baru
                                        loading = rehab = total = 0
                                        blacklisted_ids.clear()
                                        track_band_state.clear()
                                        track_history.clear()
                                        last_crossing_positions.clear()
                                        sheet_timer_start = None
                                        current_plate = "UNKNOWN"
                                        row_idx = None
                                        qr_first_scan_time.pop(qr_data, None)  # Hapus dari tracking
                                    except Exception as e:
                                        print(f"Error finalize data: {e}")
                                else:
                                    send_telegram_message(f"✅ QR plat {current_plate} konfirmasi selesai. Tidak ada data untuk disimpan.", args.notify_token, args.notify_chat_id)
                            else:
                                # QR sama tapi belum cooldown - abaikan
                                remaining_secs = int(qr_scan_cooldown - time_since_first)
                                remaining = max(1, remaining_secs // 60)
                                print(f"QR {qr_data} di-scan lagi, tunggu {remaining} menit lagi untuk konfirmasi selesai")
                                continue
                        else:
                            # QR berbeda - switch ke plat baru
                            # Finalize data sebelumnya jika ada
                            if row_idx is not None and (loading > 0 or rehab > 0):
                                try:
                                    finalize_sheet(ws, row_idx, loading, rehab, datetime.datetime.fromtimestamp(last_activity).strftime("%H:%M:%S"))
                                    send_telegram_message(f"✅ Penghitungan untuk {current_plate} selesai. Mulai untuk plat baru {qr_data}.", args.notify_token, args.notify_chat_id)
                                except Exception as e:
                                    print(f"Error finalize data: {e}")
                            
                            # Switch ke plat baru dan buat row baru di Google Sheet
                            current_plate = qr_data
                            last_scan_time = current_time
                            last_successful_scan_time = current_time # Update scan time for Smart QR Logic
                            qr_first_scan_time[qr_data] = current_time  # Simpan waktu scan pertama
                            
                            # Cari atau buat row untuk plat baru
                            if ws is not None:
                                row_idx = find_row_for_plate(ws, current_plate, today_str)
                                if row_idx is None:
                                    # Row baru - buat dengan data lengkap (konfirmasi plat)
                                    kloter = calculate_kloter(ws, current_plate, today_str)
                                    now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                    try:
                                        append_row_safe(ws, [current_plate, today_str, now_str, "", 0, 0, kloter])
                                        rows = execute_with_timeout(ws.get_all_values, timeout=10)
                                        row_idx = len(rows) if rows else None
                                        send_telegram_message(f"✅ Plat {current_plate} terscan dan siap dihitung (Tanggal={today_str}, Jam Mulai={now_str}, Kloter={kloter}).", args.notify_token, args.notify_chat_id)
                                        print(f"QR plat {current_plate} di scan. Konfirmasi plat - Row baru dibuat: Tanggal={today_str}, Jam Datang={now_str}, Kloter={kloter}")
                                    except Exception as e:
                                        print(f"Error creating row for {current_plate}: {e}")
                                        send_telegram_message(f"⚠️ Error membuat row untuk {current_plate}, akan dicoba lagi saat koneksi kembali", system_token, system_chat_id)
                                        row_idx = None
                                else:
                                    # Row sudah ada - reset tracking dan count
                                    qr_first_scan_time[qr_data] = current_time  # Reset waktu scan pertama
                                    send_telegram_message(f"✅ Plat {current_plate} terscan dan siap dihitung (menggunakan data sebelumnya).", args.notify_token, args.notify_chat_id)
                                    print(f"QR plat {current_plate} di scan. Konfirmasi plat - Menggunakan row yang sudah ada.")
                            else:
                                print("⚠️ Google Sheets not connected, cannot create row")
                                row_idx = None
                            
                            # Reset count
                            loading = rehab = total = 0
                            blacklisted_ids.clear()
                            track_band_state.clear()
                            track_history.clear()
                            last_crossing_positions.clear()
                            sheet_timer_start = None  # Reset timer juga

                now = time.time()
                
                # Buat display_frame dasar dulu untuk memastikan window selalu update
                display_frame_base = cv2.resize(frame, (display_w, display_h))
                
                # Calculate bands based on mode
                if detection_mode == "horizontal":
                    # Horizontal Line (detects vertical movement)
                    line_pos = int(h * line_y_prop)
                    gap_px = int(h * mid_gap_prop / 2)
                    band1 = line_pos - gap_px  # Top band (smaller y)
                    band2 = line_pos + gap_px  # Bottom band (larger y)
                else:
                    # Vertical Line (detects horizontal movement)
                    line_pos = int(w * line_x_prop)
                    gap_px = int(w * mid_gap_prop / 2)
                    band1 = line_pos - gap_px  # Left band (smaller x)
                    band2 = line_pos + gap_px  # Right band (larger x)

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

                # Pastikan detect_frame valid
                if detect_frame.size == 0:
                    print("Warning: Empty detect_frame, skipping detection...")
                    # Tetap tampilkan frame meski tanpa detection
                    display_frame = cv2.resize(frame, (display_w, display_h))
                    cv2.imshow(window_name, display_frame)
                    cv2.waitKey(1)
                    continue

                # Jangan tampilkan frame_base di sini karena akan menimpa display_frame yang sudah ada drawing
                # Biarkan display_frame yang sudah lengkap dengan drawing yang ditampilkan
                
                # Untuk TensorRT, gunakan device='cuda' dan skip half precision (sudah dioptimasi)
                
                try:
                    if is_tensorrt:
                        results = model.track(detect_frame, persist=True, imgsz=args.imgsz, conf=current_conf, iou=current_iou, device='cuda', verbose=False, max_det=20)
                    else:
                        results = model.track(detect_frame, persist=True, imgsz=args.imgsz, conf=current_conf, iou=current_iou, device=device, verbose=False, half=args.half if device == 'cuda' else False, max_det=20)
                except Exception as detect_error:
                    print(f"Error during detection: {detect_error}")
                    import traceback
                    traceback.print_exc()
                    # Tetap tampilkan frame meski detection gagal
                    display_frame = cv2.resize(frame, (display_w, display_h))
                    
                    # Gambar garis dan UI
                    # Gambar garis dan UI
                    if detection_mode == "horizontal":
                        line_y_display = int(line_pos * display_h / h)
                        band1_display = int(band1 * display_h / h)
                        band2_display = int(band2 * display_h / h)
                        cv2.line(display_frame, (0, line_y_display), (display_w, line_y_display), (255, 0, 0), 2)
                        cv2.line(display_frame, (0, band1_display), (display_w, band1_display), (0, 0, 255), 1)
                        cv2.line(display_frame, (0, band2_display), (display_w, band2_display), (0, 0, 255), 1)
                    else:
                        line_x_display = int(line_pos * display_w / w)
                        band1_display = int(band1 * display_w / w)
                        band2_display = int(band2 * display_w / w)
                        cv2.line(display_frame, (line_x_display, 0), (line_x_display, display_h), (255, 0, 0), 2)
                        cv2.line(display_frame, (band1_display, 0), (band1_display, display_h), (0, 0, 255), 1)
                        cv2.line(display_frame, (band2_display, 0), (band2_display, display_h), (0, 0, 255), 1)
                    
                    # Draw Unified Counter Box (Error handling)
                    # Constants
                    font_scale, font_thick = 0.7, 2
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    pad, line_gap = 10, 8
                    box_x, box_y = 10, 10
                    
                    # Data
                    # Data
                    items = [("Loading", loading, (0, 255, 0)), ("Rehab", rehab, (0, 0, 255)), ("Total", total, (255, 0, 0))]
                    
                    # Calculate sizes
                    max_lbl_w = 0
                    max_val_w = 0
                    txt_h = 0
                    (colon_w, _), _ = cv2.getTextSize(":", font, font_scale, font_thick)
                    (min_val_w, _), _ = cv2.getTextSize("0000", font, font_scale, font_thick) # Min width for 4 digits
                    
                    for lbl, val, _ in items:
                        (lw, lh), _ = cv2.getTextSize(lbl, font, font_scale, font_thick)
                        (vw, _), _ = cv2.getTextSize(str(val), font, font_scale, font_thick)
                        max_lbl_w = max(max_lbl_w, lw)
                        max_val_w = max(max_val_w, vw)
                        txt_h = max(txt_h, lh)
                    
                    max_val_w = max(max_val_w, min_val_w) # Prevent jitter
                    
                    # Box dimensions
                    box_w = pad * 2 + max_lbl_w + colon_w + 10 + max_val_w
                    box_h = pad * 2 + (txt_h * 3) + (line_gap * 2)
                    
                    # Draw Box
                    cv2.rectangle(display_frame, (box_x, box_y), (box_x + box_w, box_y + box_h), (255, 255, 255), -1)
                    cv2.rectangle(display_frame, (box_x, box_y), (box_x + box_w, box_y + box_h), (0, 0, 0), 3) # Thicker border
                    
                    # Draw Text
                    curr_y = box_y + pad + txt_h
                    for lbl, val, col in items:
                        # Label
                        cv2.putText(display_frame, lbl, (box_x + pad, curr_y), font, font_scale, col, font_thick)
                        # Colon
                        cv2.putText(display_frame, ":", (box_x + pad + max_lbl_w + 2, curr_y), font, font_scale, col, font_thick)
                        # Value
                        cv2.putText(display_frame, str(val), (box_x + pad + max_lbl_w + colon_w + 8, curr_y), font, font_scale, col, font_thick)
                        curr_y += txt_h + line_gap
                    
                    # "DETECTION ERROR" di kanan atas
                    error_text = "DETECTION ERROR"
                    (text_width, text_height), baseline = cv2.getTextSize(error_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
                    error_x = display_w - text_width - 10
                    error_y = text_height + 10
                    cv2.rectangle(display_frame, 
                                 (error_x - 5, error_y - text_height - 5), 
                                 (error_x + text_width + 5, error_y + 5), 
                                 (0, 0, 0), -1)
                    cv2.putText(display_frame, error_text, (error_x, error_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    
                    cv2.imshow(window_name, display_frame)
                    cv2.waitKey(1)
                    continue

                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        conf_score = box.conf[0].item()
                        if conf_score < current_conf:
                            continue

                        track_id = int(box.id[0].item()) if box.id is not None else None
                        
                        # Filter by Area (ignore small noise)
                        box_w = box.xywh[0][2].item()
                        box_h = box.xywh[0][3].item()
                        box_area_prop = (box_w * box_h) / (w * h)
                        if box_area_prop < args.min_area:
                            # print(f"Ignored small object: {box_area_prop:.4f}")
                            continue

                        if track_id is None or now < blacklisted_ids.get(track_id, 0):
                            continue

                        # Update last seen for memory cleanup
                        track_last_seen[track_id] = now

                        # === PERSISTENCE CHECK ===
                        # Update history count
                        track_history[track_id] = track_history.get(track_id, 0) + 1
                        
                        # Jika belum mencapai minimum persistence, skip (anggap noise/ghost)
                        if track_history[track_id] < MIN_PERSISTENCE:
                            # print(f"Track {track_id} ignored (persistence: {track_history[track_id]}/{MIN_PERSISTENCE})")
                            continue

                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        x1 += detect_x_start_orig
                        x2 += detect_x_start_orig
                        y1 += detect_y_start_orig
                        y2 += detect_y_start_orig
                        cx = (x1 + x2) // 2
                        cy = (y1 + y2) // 2

                        # === LOGIKA BARU: STATE MACHINE (MEMORY) ===
                        # Tentukan posisi band saat ini based on mode
                        if detection_mode == "horizontal":
                            # Vertical movement (check cy vs bands)
                            # band1 is Top (low y), band2 is Bottom (high y)
                            if cy < band1:
                                current_band = 'top'
                            elif cy > band2:
                                current_band = 'bottom'
                            else:
                                current_band = 'middle'
                        else:
                            # Horizontal movement (check cx vs bands)
                            # band1 is Left (low x), band2 is Right (high x)
                            if cx < band1:
                                current_band = 'left'
                            elif cx > band2:
                                current_band = 'right'
                            else:
                                current_band = 'middle'
                        
                        # Ambil posisi band sebelumnya (jika ada)
                        prev_band = track_band_state.get(track_id, None)

                        crossing_detected = False
                        direction = None
                        
                        # Update State Logic:
                        # 1. Jika masuk Middle: JANGAN RESET state. Biarkan state terakhir tersimpan.
                        # 2. Jika masuk Outer Bands: Update state.
                        # 3. Crossing terjadi jika: Current != Prev AND Prev is not None.
                        
                        if current_band != 'middle':
                            # Hanya proses perubahan state jika berada di zona valid
                            
                            if prev_band is not None and prev_band != current_band:
                                # Valid crossing detected!
                                if detection_mode == "horizontal":
                                    # Horizontal Mode Logic
                                    # Bawah ke Atas (Bottom -> Top) => Loading
                                    if prev_band == 'bottom' and current_band == 'top':
                                        direction = 'B2T'
                                        crossing_detected = True
                                    # Atas ke Bawah (Top -> Bottom) => Rehab
                                    elif prev_band == 'top' and current_band == 'bottom':
                                        direction = 'T2B'
                                        crossing_detected = True
                                else:
                                    # Vertical Mode Logic (Existing)
                                    if prev_band == 'left' and current_band == 'right':
                                        direction = 'L2R'
                                        crossing_detected = True
                                    elif prev_band == 'right' and current_band == 'left':
                                        direction = 'R2L'
                                        crossing_detected = True
                            
                            # Update state ke posisi baru
                            track_band_state[track_id] = current_band
                        else:
                            # Jika di middle, kita TIDAK update track_band_state.
                            # Kita biarkan sistem "mengingat" posisi terakhir.
                            # Ini memungkinkan objek bergerak Outer -> Middle -> other Outer dan tetap terhitung!
                            pass
                        
                        if crossing_detected:
                            # 1. INDIVIDUAL COOLDOWN CHECK (PENTING - ini yang utama)
                            # Setiap track_id memiliki cooldown sendiri, jadi icetube berbeda tidak saling mempengaruhi
                            if now < blacklisted_ids.get(track_id, 0):
                                print(f"Ignored double count (Individual Cooldown): track_id={track_id}, remaining={blacklisted_ids[track_id] - now:.3f}s")
                                continue
                            
                            # 2. POSITION HISTORY CHECK (untuk prevent double count pada track_id yang SAMA)
                            # Hanya check jika track_id ini pernah crossing sebelumnya
                            if track_id in last_crossing_positions:
                                last_pos, last_time = last_crossing_positions[track_id]
                                
                                # Hitung jarak berdasarkan mode (cx atau cy)
                                current_pos_val = cy if detection_mode == "horizontal" else cx
                                distance = abs(current_pos_val - last_pos)
                                
                                time_since = now - last_time  # Waktu sejak crossing terakhir
                                
                                # Hanya ignore jika:
                                # - Posisi SANGAT dekat (< 30px) DAN
                                # - Waktu SANGAT singkat (< 1.5s) DAN
                                # - Track ID SAMA (prevent double count SAME icetube)
                                if distance < MIN_CROSSING_DISTANCE and time_since < MIN_CROSSING_TIME:
                                    print(f"Ignored double count (Same track_id, too close): track_id={track_id}, distance={distance:.1f}px, time={time_since:.3f}s")
                                    continue
                            
                            # 3. GLOBAL COOLDOWN CHECK (SANGAT RINGAN - hanya untuk extreme case)
                            # Cooldown global ringan untuk mencegah multiple icetube lewat bersamaan dalam frame yang sama
                            if now - last_count_time < GLOBAL_COOLDOWN:
                                print(f"Ignored double count (Global Cooldown - extreme case): track_id={track_id}, time_since_last={now - last_count_time:.3f}s")
                                continue

                            # VALID - Count icetube
                            print(f"Crossing detected: {direction}, track_id={track_id}, prev={prev_band}, curr={current_band}, pos={cy if detection_mode=='horizontal' else cx}")
                            
                            if direction == 'L2R' or direction == 'T2B':
                                # L2R (Vertical) OR Top-to-Bottom (Horizontal) = Rehab
                                rehab += 1
                                total = loading - rehab
                                rehab_anim = True
                                anim_start_time = now
                                print(f"[{datetime.datetime.now()}] Rehab hit: {direction}, track_id={track_id}, conf={conf_score}")
                            elif direction == 'R2L' or direction == 'B2T':
                                # R2L (Vertical) OR Bottom-to-Top (Horizontal) = Loading
                                loading += 1
                                total = loading - rehab
                                loading_anim = True
                                anim_start_time = now
                                print(f"[{datetime.datetime.now()}] Loading hit: {direction}, track_id={track_id}, conf={conf_score}")
                            
                            last_activity = now
                            last_count_time = now  # Update global cooldown untuk logging
                            last_count_activity_time = now # Update activity time for Smart QR Logic
            
                            # Update cooldowns dan position history
                            blacklisted_ids[track_id] = now + INDIVIDUAL_COOLDOWN  # Individual cooldown 2.0s per track_id
                            # Simpan position history per track_id (X atau Y tergantung mode)
                            last_crossing_positions[track_id] = (cy if detection_mode == "horizontal" else cx, now)
                            
                            # RESET band state setelah dihitung untuk mencegah double count saat ditarik kembali
                            # Ini mencegah icetube yang sama dihitung lagi jika ditarik bolak-balik
                            if track_id in track_band_state:
                                del track_band_state[track_id]
                                print(f"Track {track_id} counted, resetting band state to prevent double count on pullback")
                            
                            # Band state akan diupdate lagi di iterasi berikutnya jika icetube masih terdeteksi
                            # Tapi dengan state yang baru, tidak akan bisa crossing lagi sampai benar-benar keluar dan masuk lagi
                            
                            # Reset timer 10 menit setiap kali ada deteksi loading/rehab baru
                            if loading > 0 or rehab > 0:
                                sheet_timer_start = now  # Reset timer ke 10 menit lagi
                                print(f"Timer 10 menit untuk kirim data Google Sheets direset (count={total})")
                                
                                # Jika UNKNOWN dan belum ada row, buat row baru
                                if current_plate == "UNKNOWN" and row_idx is None and ws is not None:
                                    try:
                                        kloter = calculate_kloter(ws, "UNKNOWN", today_str)
                                        now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                        append_row_safe(ws, ["UNKNOWN", today_str, now_str, "", loading, rehab, kloter])
                                        rows = execute_with_timeout(ws.get_all_values, timeout=10)
                                        row_idx = len(rows) if rows else None
                                        send_telegram_message(f"✅ UNKNOWN row created: Plat=UNKNOWN, Tanggal={today_str}, Jam Datang={now_str}, Kloter={kloter}", args.notify_token, args.notify_chat_id)
                                        print(f"UNKNOWN row created: Loading={loading}, Rehab={rehab}")
                                    except Exception as e:
                                        print(f"Error creating UNKNOWN row: {e}")
                            elif loading == 0 and rehab == 0:
                                # Jika count kembali ke 0, reset timer
                                sheet_timer_start = None

                        box_color = (0, 255, 0) if not crossing_detected else (255, 0, 255)
                        # Simpan box untuk digambar di display_frame nanti (setelah resize)
                        # Box akan digambar di display_frame dengan koordinat yang sudah di-scale
                        # Untuk sekarang, gambar di frame original juga (akan ikut ter-resize)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

                # Resize frame ke display size dulu (tanpa garis, karena garis akan digambar di display_frame)
                display_frame = cv2.resize(frame, (display_w, display_h))
                
                # Pastikan display_frame valid
                if display_frame is None or display_frame.size == 0:
                    print(f"Error: Failed to create display_frame, using base frame")
                    display_frame = display_frame_base.copy()
                
                # Gambar garis di display_frame dengan koordinat yang sudah di-scale
                if detection_mode == "horizontal":
                    line_y_display = int(line_pos * display_h / h)
                    band1_display = int(band1 * display_h / h)
                    band2_display = int(band2 * display_h / h)
                    cv2.line(display_frame, (0, line_y_display), (display_w, line_y_display), (255, 0, 0), 2)
                    cv2.line(display_frame, (0, band1_display), (display_w, band1_display), (0, 0, 255), 1)
                    cv2.line(display_frame, (0, band2_display), (display_w, band2_display), (0, 0, 255), 1)
                else:
                    line_x_display = int(line_pos * display_w / w)
                    band1_display = int(band1 * display_w / w)
                    band2_display = int(band2 * display_w / w)
                    cv2.line(display_frame, (line_x_display, 0), (line_x_display, display_h), (255, 0, 0), 2)
                    cv2.line(display_frame, (band1_display, 0), (band1_display, display_h), (0, 0, 255), 1)
                    cv2.line(display_frame, (band2_display, 0), (band2_display, display_h), (0, 0, 255), 1)
                
                # Gambar ROI rectangle di display_frame (koordinat sudah dalam display size)
                cv2.rectangle(display_frame, (detect_x_start, detect_y_start), (detect_x_end, detect_y_end), (255, 0, 0), 2)

                # Timer untuk kirim data ke Google Sheets (hanya jika count > 0)
                if sheet_timer_start is not None and (loading > 0 or rehab > 0):
                    elapsed = now - sheet_timer_start
                    remaining_secs = max(0, SHEET_TIMER_DURATION - elapsed)
                    mins, secs = divmod(int(remaining_secs), 60)
                    # Timer drawing moved to top center
                    pass
                    
                    # Jika timer habis, kirim data ke Google Sheets (async untuk non-blocking)
                    if elapsed >= SHEET_TIMER_DURATION:
                        try:
                            if row_idx is not None:
                                finalize_sheet_async(ws, row_idx, loading, rehab, datetime.datetime.fromtimestamp(last_activity).strftime("%H:%M:%S"))
                                send_telegram_message_async(f"✅ Penghitungan untuk {current_plate} selesai (timer 10 menit).", args.notify_token, args.notify_chat_id)
                                print(f"Data otomatis dikirim ke Google Sheets: Loading={loading}, Rehab={rehab}")
                            else:
                                # Buat row baru jika belum ada (hanya jika bukan UNKNOWN atau ada count > 0)
                                if ws is not None:
                                    if current_plate == "UNKNOWN" and (loading > 0 or rehab > 0):
                                        # UNKNOWN hanya dibuat row jika ada count > 0
                                        kloter = calculate_kloter(ws, "UNKNOWN", today_str)
                                        now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                        # Async untuk non-blocking
                                        def _append_unknown(today_str=today_str):
                                            try:
                                                append_row_safe(ws, [current_plate, today_str, now_str, datetime.datetime.now().strftime("%H:%M:%S"), loading, rehab, kloter])
                                            except Exception as e:
                                                print(f"Error appending UNKNOWN row: {e}")
                                        threading.Thread(target=_append_unknown, daemon=True).start()
                                        send_telegram_message_async(f"✅ Penghitungan untuk UNKNOWN selesai (timer 10 menit).", args.notify_token, args.notify_chat_id)
                                        print(f"Data UNKNOWN otomatis dikirim ke Google Sheets: Loading={loading}, Rehab={rehab}")
                                    elif current_plate != "UNKNOWN":
                                        # Plat normal, buat row baru
                                        kloter = calculate_kloter(ws, current_plate, today_str)
                                        now_str = datetime.datetime.now().strftime("%H:%M:%S")
                                        # Async untuk non-blocking
                                        def _append_row(today_str=today_str):
                                            try:
                                                append_row_safe(ws, [current_plate, today_str, now_str, datetime.datetime.now().strftime("%H:%M:%S"), loading, rehab, kloter])
                                            except Exception as e:
                                                print(f"Error appending row: {e}")
                                        threading.Thread(target=_append_row, daemon=True).start()
                                        send_telegram_message_async(f"✅ Penghitungan untuk {current_plate} selesai (timer 10 menit).", args.notify_token, args.notify_chat_id)
                                        print(f"Data otomatis dikirim ke Google Sheets: Loading={loading}, Rehab={rehab}")
                                else:
                                    print("⚠️ Google Sheets not connected, cannot save data")
                            
                            # Reset timer dan count (tidak kembali ke QR standby, hanya reset count)
                            loading = rehab = total = 0
                            blacklisted_ids.clear()
                            track_band_state.clear()
                            last_crossing_positions.clear()
                            sheet_timer_start = None
                            # Set plate ke UNKNOWN setelah reset
                            current_plate = "UNKNOWN"
                            row_idx = None
                            send_telegram_message(f"✅ Sistem siam menghitung kembali", args.notify_token, args.notify_chat_id)
                        except Exception as e:
                            print(f"Error kirim data ke Google Sheets: {e}")
                            send_telegram_message(f"❌ Error kirim data ke Google Sheets: {e}", system_token, system_chat_id)
                else:
                    # Jika count 0, tidak ada timer
                    # Timer OFF text removed
                    pass

                # Draw Unified Counter Box (Main loop)
                # Constants
                font_scale, font_thick = 0.7, 2
                font = cv2.FONT_HERSHEY_SIMPLEX
                pad, line_gap = 10, 8
                box_x, box_y = 10, 10
                
                # Data
                items = [("Loading", loading, (0, 255, 0)), ("Rehab", rehab, (0, 0, 255)), ("Total", total, (255, 0, 0))]
                
                # Calculate sizes
                max_lbl_w = 0
                max_val_w = 0
                txt_h = 0
                (colon_w, _), _ = cv2.getTextSize(":", font, font_scale, font_thick)
                (min_val_w, _), _ = cv2.getTextSize("0000", font, font_scale, font_thick) # Min width for 4 digits
                
                for lbl, val, _ in items:
                    (lw, lh), _ = cv2.getTextSize(lbl, font, font_scale, font_thick)
                    (vw, _), _ = cv2.getTextSize(str(val), font, font_scale, font_thick)
                    max_lbl_w = max(max_lbl_w, lw)
                    max_val_w = max(max_val_w, vw)
                    txt_h = max(txt_h, lh)
                
                max_val_w = max(max_val_w, min_val_w) # Prevent jitter
                
                # Box dimensions
                box_w = pad * 2 + max_lbl_w + colon_w + 10 + max_val_w
                box_h = pad * 2 + (txt_h * 3) + (line_gap * 2)
                
                # Draw Box
                cv2.rectangle(display_frame, (box_x, box_y), (box_x + box_w, box_y + box_h), (255, 255, 255), -1)
                cv2.rectangle(display_frame, (box_x, box_y), (box_x + box_w, box_y + box_h), (0, 0, 0), 3) # Thicker border
                
                # Draw Text
                curr_y = box_y + pad + txt_h
                for lbl, val, col in items:
                    # Label
                    cv2.putText(display_frame, lbl, (box_x + pad, curr_y), font, font_scale, col, font_thick)
                    # Colon
                    cv2.putText(display_frame, ":", (box_x + pad + max_lbl_w + 2, curr_y), font, font_scale, col, font_thick)
                    # Value
                    cv2.putText(display_frame, str(val), (box_x + pad + max_lbl_w + colon_w + 8, curr_y), font, font_scale, col, font_thick)
                    curr_y += txt_h + line_gap
                
                # Status koneksi Google Sheets
                if ws is not None:
                    sheet_status = "✅ Sheets OK"
                    sheet_color = (0, 255, 0)
                else:
                    sheet_status = "⚠️ Sheets Disconnected"
                    sheet_color = (0, 165, 255)
                cv2.putText(display_frame, sheet_status, (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, sheet_color, 2)
                
                # FPS di kanan atas
                fps_text = f"FPS: {fps:.1f}"
                (fps_text_width, fps_text_height), _ = cv2.getTextSize(fps_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
                fps_x = display_w - fps_text_width - 10
                fps_y = fps_text_height + 10  # Posisi normal di kanan atas
                # Background untuk FPS juga untuk konsistensi dan menghindari flickering
                cv2.rectangle(display_frame, 
                             (fps_x - 5, fps_y - fps_text_height - 5), 
                             (fps_x + fps_text_width + 5, fps_y + 5), 
                             (0, 0, 0), -1)  # Background hitam solid
                cv2.putText(display_frame, fps_text, (fps_x, fps_y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
                
                # Plat di bawah FPS dengan desain plat Indonesia
                plate_text = current_plate  # Hanya teks plat tanpa "Plate:"
                (plate_text_width, plate_text_height), _ = cv2.getTextSize(plate_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
                plate_x = display_w - plate_text_width - 10  # Sejajar dengan FPS
                plate_y = fps_y + fps_text_height + 15  # Tepat di bawah FPS
                
                # Desain plat Indonesia: background putih dengan border hitam
                padding = 5
                border_thickness = 2
                plate_rect_x1 = plate_x - padding - border_thickness
                plate_rect_y1 = plate_y - plate_text_height - padding - border_thickness
                plate_rect_x2 = plate_x + plate_text_width + padding + border_thickness
                plate_rect_y2 = plate_y + padding + border_thickness
                
                # Draw background putih
                cv2.rectangle(display_frame, 
                             (plate_rect_x1 + border_thickness, plate_rect_y1 + border_thickness), 
                             (plate_rect_x2 - border_thickness, plate_rect_y2 - border_thickness), 
                             (255, 255, 255), -1)  # Background putih
                
                # Draw border hitam (outline)
                cv2.rectangle(display_frame, 
                             (plate_rect_x1, plate_rect_y1), 
                             (plate_rect_x2, plate_rect_y2), 
                             (0, 0, 0), border_thickness)  # Border hitam
                
                # Draw teks hitam
                cv2.putText(display_frame, plate_text, (plate_x, plate_y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
                # Top Center Display: QR Waiting Animation OR Timer
                if current_plate == "UNKNOWN":
                    # Typing Animation "MENUNGGU QR..."
                    full_text = "MENUNGGU QR..."
                    # Speed: 4 chars/sec, +6 for pause at end
                    anim_idx = int(time.time() * 4) % (len(full_text) + 6)
                    disp_text = full_text[:min(len(full_text), anim_idx)]
                    
                    font_scale = 0.9
                    thickness = 2
                    (tw, th), _ = cv2.getTextSize(full_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
                    tx = (display_w - tw) // 2
                    ty = 40
                    
                    # Background (White)
                    cv2.rectangle(display_frame, (tx-10, ty-th-10), (tx+tw+10, ty+10), (255,255,255), -1)
                    # Border (Black)
                    cv2.rectangle(display_frame, (tx-10, ty-th-10), (tx+tw+10, ty+10), (0,0,0), 2)
                    # Text (Orange)
                    cv2.putText(display_frame, disp_text, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 165, 255), thickness)
                    
                elif sheet_timer_start is not None and (loading > 0 or rehab > 0):
                    # Show Timer
                    elapsed = now - sheet_timer_start
                    remaining_secs = max(0, SHEET_TIMER_DURATION - elapsed)
                    mins, secs = divmod(int(remaining_secs), 60)
                    timer_text = f"TIMER: {mins:02d}:{secs:02d}"
                    
                    font_scale = 0.9
                    thickness = 2
                    (tw, th), _ = cv2.getTextSize(timer_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
                    tx = (display_w - tw) // 2
                    ty = 40
                    
                    text_color = (0, 0, 255) if remaining_secs < 60 else (0, 165, 255) # Red if < 1 min, else Orange
                    
                    # Background (White)
                    cv2.rectangle(display_frame, (tx-10, ty-th-10), (tx+tw+10, ty+10), (255,255,255), -1)
                    # Border (Black)
                    cv2.rectangle(display_frame, (tx-10, ty-th-10), (tx+tw+10, ty+10), (0,0,0), 2)
                    # Text
                    cv2.putText(display_frame, timer_text, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, font_scale, text_color, thickness)
                cv2.putText(display_frame, f"Conf: {current_conf:.2f} IoU: {current_iou:.2f} Mode: {detection_mode.upper()}", (10, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                
                # Debug Info Text
                if detection_mode == "horizontal":
                    pos_text = f"line_y: {line_y_prop:.2f}"
                else:
                    pos_text = f"line_x: {line_x_prop:.2f}"
                
                cv2.putText(display_frame, f"{pos_text} gap: {mid_gap_prop:.2f} roi_x: {roi_x_prop:.2f} w: {roi_width_prop:.2f} y: {roi_y_prop:.2f} h: {roi_height_prop:.2f}", (10, display_h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
                cv2.putText(display_frame, "g/G: geser garis, h/H: gap, I: toggle mode, O/K: +/- height, J/L: geser ROI, R: reset, Q: quit", (10, display_h - 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
                cv2.putText(display_frame, "MAIN V2 - No QR Standby Mode", (display_w - 250, display_h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

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

                # Pastikan display_frame valid sebelum ditampilkan
                if display_frame is not None and display_frame.size > 0:
                    try:
                        # Debug: verifikasi UI overlay sudah ada
                        # if frame_count == 1 or frame_count % 100 == 0:
                            # Disabled verbose logging for performance
                            # print(f"Frame {frame_count}: Displaying {display_frame.shape[1]}x{display_frame.shape[0]} to window")
                            # print(f"  - Loading: {loading}, Rehab: {rehab}, Total: {total}")
                            # print(f"  - FPS: {fps:.1f}, Plate: {current_plate}")
                            # print(f"  - Line_x: {line_x_display}, Left_band: {left_band_display}, Right_band: {right_band_display}")
                        
                        
                        # --- ZMQ PUBLISH (Kirim frame yg ada UI ke API Server) ---
                        if zmq_socket:
                            try:
                                # 1. Encode JPEG
                                ret_enc, buffer_enc = cv2.imencode('.jpg', display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
                                if ret_enc:
                                    # 2. Kirim Header+Data
                                    zmq_socket.send_string("video", flags=zmq.SNDMORE)
                                    zmq_socket.send(buffer_enc.tobytes())
                                    
                                    # 3. Kirim Stats (Optional, hemat bandwidth)
                                    if frame_count % 5 == 0: # Update stats tiap 5 frame
                                         stats_data = {
                                             "inbound": loading, 
                                             "outbound": rehab,
                                             "total": total,
                                             "fps": round(fps, 1),
                                             "plate": current_plate
                                         }
                                         zmq_socket.send_string("stats", flags=zmq.SNDMORE)
                                         zmq_socket.send_json(stats_data)
                            except Exception as ex_zmq:
                                # Jangan print tiap frame, bikin spam. Print sekali-sekali.
                                pass

                        cv2.imshow(window_name, display_frame)
                    except cv2.error as e:
                        print(f"OpenCV imshow error: {e}")
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"Warning: Invalid display_frame at frame {frame_count}")
                    # Fallback ke base frame jika display_frame invalid
                    if 'display_frame_base' in locals():
                        cv2.imshow(window_name, display_frame_base)
                        cv2.waitKey(1)

                curr_time = time.time()
                fps = 1 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else fps
                prev_time = curr_time

                # WAJIB: Panggil waitKey() setiap iterasi untuk update window dan handle events
                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC key
                    print("ESC pressed, exiting...")
                    break
                elif key == -1:
                    # No key pressed, continue
                    pass
                elif key == ord('g'):
                    if detection_mode == "horizontal":
                        line_y_prop = max(0.0, line_y_prop - 0.01)
                    else:
                        line_x_prop = max(0.0, line_x_prop - 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('G'):
                    if detection_mode == "horizontal":
                        line_y_prop = min(1.0, line_y_prop + 0.01)
                    else:
                        line_x_prop = min(1.0, line_x_prop + 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('h'):
                    mid_gap_prop = max(0.0, mid_gap_prop - 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('H'):
                    mid_gap_prop = min(1.0, mid_gap_prop + 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('J'):
                    roi_x_prop = max(0.0, roi_x_prop - 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('L'):
                    roi_x_prop = min(1.0, roi_x_prop + 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('I'):
                    # Change mode
                    detection_mode = "horizontal" if detection_mode == "vertical" else "vertical"
                    print(f"Detection Mode changed to: {detection_mode}")
                    track_band_state.clear() # Clear state on mode switch
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('O'):
                    roi_height_prop = min(1.0, roi_height_prop + 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('K'):
                    roi_height_prop = max(0.1, roi_height_prop - 0.01)
                    save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
                elif key == ord('R'):
                    loading = rehab = total = 0
                    blacklisted_ids.clear()
                    track_band_state.clear()
                    last_crossing_positions.clear()
                elif key == ord('C'):
                    debug_low_thresh = not debug_low_thresh
                    current_conf = 0.05 if debug_low_thresh else args.conf
                    current_iou = 0.15 if debug_low_thresh else args.iou  # Reduced from 0.2 to 0.15
                    print(f"Debug mode: {'ON' if debug_low_thresh else 'OFF'} (conf={current_conf}, iou={current_iou})")
                elif key == ord('Q'):
                    print("🛑 'Q' key pressed. Initiating manual shutdown...")
                    with open("shutdown_log.txt", "a") as f:
                        f.write(f"{datetime.datetime.now()}: Manual shutdown via Q key\n")
                    # Finalize data sebelum exit
                    try:
                        if row_idx is not None and (loading > 0 or rehab > 0):
                            finalize_sheet(ws, row_idx, loading, rehab, datetime.datetime.fromtimestamp(last_activity).strftime("%H:%M:%S"))
                            send_telegram_message(f"✅ Data disimpan sebelum exit: Loading={loading}, Rehab={rehab}.", args.notify_token, args.notify_chat_id)
                    except Exception as e:
                        print(f"Error finalize data sebelum exit: {e}")
                    break

                # Removed idle timeout - main_v2 doesn't exit on idle

                # Cleanup old blacklisted_ids dan position history
                blacklisted_ids = {k: v for k, v in blacklisted_ids.items() if now < v}
                last_crossing_positions = {
                    k: v for k, v in last_crossing_positions.items() 
                    if now - v[1] < POSITION_HISTORY_TTL  # Hapus history > 5 detik
                }
                
                # Cleanup old tracking data (Memory Leak Fix)
                # Cleanup track_ids yang sudah tidak terlihat lebih dari 30 detik
                stale_ids = [tid for tid, ts in track_last_seen.items() if now - ts > 30.0]
                for tid in stale_ids:
                    track_last_seen.pop(tid, None)
                    track_history.pop(tid, None)
                    track_band_state.pop(tid, None)
                    # blacklisted_ids dan last_crossing_positions sudah dibersihkan logic mereka sendiri
                
                # Health check / WATCHDOG - Force restart jika macet total
                # Reconnect akan ditangani oleh capture_thread, tapi jika gagal terus > 60 detik, kill script
                # agar auto_run_cctv.bat bisa merestart ulang dari awal (fresh process)
                if time.time() - last_frame_received > 60:
                    print(f"❌ WATCHDOG TIMEOUT: No frames for {int(time.time() - last_frame_received)} seconds")
                    print("Killing process to force auto-restart...")
                    sys.exit(1) # Force exit with error code

            except QueueEmpty:
                # Critical Fix: Add waitKey even when queue is empty to prevent UI freeze
                cv2.waitKey(1)
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
        import traceback
        traceback.print_exc()
        with open("crash_log.txt", "a") as f:
            f.write(f"\n{datetime.datetime.now()} - Critical Main Loop Crash:\n")
            traceback.print_exc(file=f)

    finally:
        with open("shutdown_log.txt", "a") as f:
            f.write(f"{datetime.datetime.now()}: Entering finally block\n")
        stop_event.set()
        capture_stop_event.set()
        capture_thread_obj.join(timeout=5)
        if cap.isOpened():
            cap.release()
        cv2.destroyAllWindows()
        save_state({"line_x": line_x_prop, "line_y": line_y_prop, "mid_gap": mid_gap_prop, "roi_x": roi_x_prop, "roi_width": roi_width_prop, "roi_y": roi_y_prop, "roi_height": roi_height_prop, "detection_mode": detection_mode})
        print("Cleanup completed, exiting...")
        with open("shutdown_log.txt", "a") as f:
            f.write(f"{datetime.datetime.now()}: Reached end of script (cleanup completed). Preventing exit for debug.\n")
        # sys.exit(0) # DISABLED for debugging

if __name__ == "__main__":
    main()