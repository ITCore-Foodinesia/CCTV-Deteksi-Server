import psutil
import subprocess
import time
import os
import requests
import datetime
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import GPUtil
import cv2  # Tambah untuk test RTSP
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from pathlib import Path

# Get project root (3 levels up from src/integrations/telegram/)
APP_DIR = Path(__file__).resolve().parent.parent.parent.parent
CONFIG_PATH = APP_DIR / "config" / "control_panel_config.json"

def load_bot_config():
    """Load config from control panel config file"""
    try:
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def is_auto_restart_enabled():
    """Check if auto restart V3 is enabled in config"""
    cfg = load_bot_config()
    return cfg.get("auto_restart_v3", False)

TELEGRAM_BOT_TOKEN = "7990876346:AAEm4bpPB9fKiVtC5il4dFWEANc1didd6jk"
TELEGRAM_CHAT_ID = "7678774830"
CHECK_INTERVAL = 30  # Diubah ke 30 detik untuk cek lebih cepat
REPORT_INTERVAL = 86400  # 24 jam untuk mengurangi spam
QR_STANDBY_PATH = str((APP_DIR / "qr_standby.py").resolve())
MAIN_PATH = str((APP_DIR / "archive" / "icetube_main.py").resolve())
MAIN_V2_PATH = str((APP_DIR / "archive" / "main_v2_legacy.py").resolve())  # Archived - fallback only
MAIN_V3_MODULE = "src.detection.gui_version_partial.main"  # Active V3 module
MONITOR_LOG = str((APP_DIR / "logs" / "monitor_log.txt").resolve())
STATE_FILE = str((APP_DIR / "config" / "state_main_new.json").resolve())
HEARTBEAT_LOG = str((APP_DIR / "logs" / "heartbeat_log.txt").resolve())
QR_STANDBY_CMD = [
    "python", QR_STANDBY_PATH,
    "--source", "rtsp://foodinesia:tenggarong1@192.168.1.212:554/stream1",
    "--source-type", "rtsp",
    "--model", str((APP_DIR / "models" / "bestbaru.engine").resolve()),
    "--creds", str((APP_DIR / "credentials.json").resolve()),
    "--sheet_id", "1Ry_7xYxnt9wto83G4MVLiclB7mticgxVcjxnXaZGIQM",
    "--worksheet", "AUTO_ID"
]
MAIN_CMD = [
    "python", MAIN_PATH,
    "--source", "rtsp://foodinesia:tenggarong1@192.168.1.212:554/stream1",
    "--model", str((APP_DIR / "models" / "bestbaru.engine").resolve()),
    "--creds", str((APP_DIR / "credentials.json").resolve()),
    "--sheet_id", "1Ry_7xYxnt9wto83G4MVLiclB7mticgxVcjxnXaZGIQM",
    "--worksheet", "AUTO_ID",
    "--plate", "UNKNOWN",  # Untuk mode plat unknown
    "--notify_token", TELEGRAM_BOT_TOKEN,
    "--notify_chat_id", TELEGRAM_CHAT_ID
]

# Google Sheets configuration
SHEET_ID = "1Ry_7xYxnt9wto83G4MVLiclB7mticgxVcjxnXaZGIQM"
WORKSHEET_NAME = "AUTO_ID"
CREDS_FILE = str((APP_DIR / "credentials.json").resolve())

def remove_emoji(text):
    """Remove emoji characters that cause encoding issues"""
    import re
    # Remove emojis
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE)
    return emoji_pattern.sub('', text)

def send_telegram_message(message, reply_markup=None, max_retries=3):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    session = requests.Session()
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    try:
        response = session.post(url, json=payload, timeout=10)
        if response.status_code != 200:
            print(f"Failed to send message: {response.text}")
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Gagal kirim pesan: {remove_emoji(response.text)}\n")
            return False
        print(f"Message sent successfully to chat_id {TELEGRAM_CHAT_ID}")
        return True
    except Exception as e:
        print(f"Error sending Telegram message: {e}")
        with open(MONITOR_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()} - Error kirim pesan: {e}\n")
        return False

def is_process_running(process_name):
    script_name = os.path.basename(process_name).lower()
    script_base = script_name.replace('.py', '')
    matches = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            proc_name = (proc.info.get('name') or '').lower()
            cmdline = proc.info.get('cmdline') or []
            if not cmdline:
                continue

            cmd_lower = [arg.lower() for arg in cmdline if isinstance(arg, str)]

            def _is_match(val):
                return script_name in val or (script_base and script_base in val)

            if _is_match(proc_name) or any(_is_match(arg) for arg in cmd_lower):
                full_cmdline = ' '.join(cmdline)
                matches.append({
                    'pid': proc.info['pid'],
                    'name': proc.info.get('name'),
                    'cmdline': full_cmdline
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, IndexError) as e:
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Error accessing process: {e}\n")
            continue

    with open(MONITOR_LOG, "a", encoding='utf-8') as f:
        f.write(f"{datetime.datetime.now()} - Detected processes for {script_name}: {matches}\n")

    return len(matches) > 0

def start_qr_standby():
    try:
        process = subprocess.Popen(QR_STANDBY_CMD, 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE, 
                                 text=True,
                                 encoding='utf-8',
                                 errors='replace')
        print(f"Started qr_standby.py with PID {process.pid}")
        with open(MONITOR_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()} - Started qr_standby.py with PID {process.pid}\n")
        send_telegram_message(f"QR standby berhasil dijalankan.")
        return True
    except Exception as e:
        with open(MONITOR_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()} - Gagal start qr_standby.py: {e}\n")
        send_telegram_message(f"Gagal start QR standby: {str(e)}")
        return False

def start_main():
    try:
        process = subprocess.Popen(MAIN_CMD, 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE, 
                                 text=True,
                                 encoding='utf-8',
                                 errors='replace',
                                 creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0)
        
        print(f"Started icetube_main.py with PID {process.pid}")
        
        # Tunggu 3 detik untuk memastikan process start dengan benar
        time.sleep(3)
        
        # Cek apakah process masih running
        if process.poll() is None:
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Started icetube_main.py with PID {process.pid}\n")
            send_telegram_message(f"Main detector berhasil dijalankan (plat UNKNOWN).")
            return True
        else:
            # Process sudah exit, cek error
            stdout, stderr = process.communicate()
            error_msg = stderr if stderr else stdout
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - icetube_main.py exited immediately: {error_msg}\n")
            send_telegram_message(f"Main detector gagal start: {error_msg[:200]}")
            return False
            
    except Exception as e:
        with open(MONITOR_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()} - Gagal start icetube_main.py: {e}\n")
        send_telegram_message(f"Gagal start main detector: {str(e)}")
        return False

def stop_process(process_name):
    script_name = os.path.basename(process_name).lower()
    script_base = script_name.replace('.py', '')
    terminated = False
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            proc_name = (proc.info.get('name') or '').lower()
            cmdline = proc.info.get('cmdline') or []
            if not cmdline:
                continue

            cmd_lower = [arg.lower() for arg in cmdline if isinstance(arg, str)]

            def _is_match(val):
                return script_name in val or (script_base and script_base in val)

            if _is_match(proc_name) or any(_is_match(arg) for arg in cmd_lower):
                full_cmdline = ' '.join(cmdline)
                print(f"Terminating matching process: PID {proc.info['pid']}, cmdline: {full_cmdline}")
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except Exception:
                    proc.kill()
                with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                    f.write(f"{datetime.datetime.now()} - Terminated process {script_name} with PID {proc.info['pid']}\n")
                terminated = True
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Error terminating {script_name}: {e}\n")
    return terminated

def get_system_status():
    qr_running = is_process_running(QR_STANDBY_PATH)
    main_running = is_process_running(MAIN_PATH)
    main_v3_running = is_main_v3_running()
    rtsp_status = "Terhubung" if test_rtsp_connection("rtsp://foodinesia:tenggarong1@192.168.1.212:554/stream1") else "Gagal"
    qr_status = "Berjalan" if qr_running else "Mati"
    main_status = "Berjalan" if main_running else "Mati"
    main_v3_status = "Berjalan" if main_v3_running else "Mati"
    auto_restart_status = "ON" if is_auto_restart_enabled() else "OFF"
    return f"Status Sistem:\n- Main V3: {main_v3_status}\n- QR Standby: {qr_status}\n- Main Detector (legacy): {main_status}\n- RTSP Connection: {rtsp_status}\n- Auto Restart: {auto_restart_status}"

def test_rtsp_connection(source):
    cap = cv2.VideoCapture(source)
    if cap.isOpened():
        cap.release()
        return True
    return False

def get_pc_status():
    cpu_percent = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory()
    ram_used = ram.used / (1024 ** 3)
    ram_total = ram.total / (1024 ** 3)
    gpus = GPUtil.getGPUs()
    gpu_info = "\n".join([f"GPU {gpu.id}: {gpu.load * 100:.1f}% load, {gpu.memoryUtil * 100:.1f}% memory" for gpu in gpus]) if gpus else "No GPU detected"
    return f"🖥️ Status PC:\n- CPU: {cpu_percent}%\n- RAM: {ram.percent}% ({ram_used:.1f} GB used of {ram_total:.1f} GB)\n- {gpu_info}"

def write_heartbeat(process_name):
    """Write heartbeat timestamp to log file"""
    try:
        with open(HEARTBEAT_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()} - {process_name} heartbeat\n")
    except Exception as e:
        print(f"Error writing heartbeat: {e}")

def check_process_health(process_name, max_idle_minutes=5):
    """Check if process is responding by monitoring heartbeat and CPU usage"""
    try:
        # Cek apakah process masih running
        if not is_process_running(process_name):
            return False, "Process not running"
        
        # CPU monitoring dihapus karena mengganggu - false positive pada multi-core
        
        # Extract nama file dari path untuk matching dengan heartbeat
        process_file = os.path.basename(process_name)  # e.g., "icetube_main.py" or "main_v2.py"
        # Hilangkan .py untuk matching dengan heartbeat
        process_name_key = process_file.replace('.py', '')  # e.g., "icetube_main" or "main_v2"
        
        # Cek heartbeat log - cari heartbeat terakhir dari process ini (bukan hanya baris terakhir)
        if os.path.exists(HEARTBEAT_LOG):
            with open(HEARTBEAT_LOG, "r", encoding='utf-8') as f:
                lines = f.readlines()
                if lines:
                    # Cari dari belakang untuk menemukan heartbeat terakhir dari process ini
                    last_heartbeat = None
                    for line in reversed(lines):
                        if process_name_key in line:
                            last_heartbeat = line.strip()
                            break
                    
                    if last_heartbeat:
                        # Parse timestamp dari log
                        try:
                            timestamp_str = last_heartbeat.split(" - ")[0]
                            last_time = datetime.datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S.%f")
                            time_diff = datetime.datetime.now() - last_time
                            if time_diff.total_seconds() > max_idle_minutes * 60:
                                return False, f"No heartbeat for {time_diff.total_seconds()/60:.1f} minutes"
                        except Exception as e:
                            # Jika parsing gagal, anggap sehat (karena process masih running)
                            print(f"Warning: Could not parse heartbeat timestamp: {e}")
                            pass
                    # Jika tidak ada heartbeat ditemukan tapi process masih running,
                    # mungkin baru saja start, anggap sehat
                    
        return True, "Healthy"
    except Exception as e:
        return False, f"Health check error: {e}"

def get_system_mode():
    """Determine current system mode: QR_STANDBY, MAIN_DETECTOR, MAIN_V2, or MAIN_V3"""
    main_running = is_process_running(MAIN_PATH)
    main_v2_running = is_process_running(MAIN_V2_PATH)
    main_v3_running = is_main_v3_running()
    qr_running = is_process_running(QR_STANDBY_PATH)

    if main_v3_running:
        return "MAIN_V3"
    elif main_v2_running:
        return "MAIN_V2"
    elif main_running:
        return "MAIN_DETECTOR"
    elif qr_running:
        return "QR_STANDBY"
    else:
        return "NONE"

def is_main_v3_running():
    """Check if Main V3 (gui_version_partial) is running"""
    return (is_process_running("src.detection.gui_version_partial.main") or
            is_process_running("gui_version_partial.main") or
            is_process_running("detector.py"))

def cleanup_conflicting_processes():
    """Clean up conflicting processes - only one should run at a time"""
    try:
        main_running = is_process_running(MAIN_PATH)
        main_v2_running = is_process_running(MAIN_V2_PATH)
        main_v3_running = is_main_v3_running()
        qr_running = is_process_running(QR_STANDBY_PATH)

        # Main V3 has highest priority (current active version)
        if main_v3_running:
            # Stop all others
            if main_running:
                stop_process(MAIN_PATH)
                send_telegram_message("Main detector dihentikan karena Main V3 sedang berjalan.")
            if main_v2_running:
                stop_process(MAIN_V2_PATH)
                send_telegram_message("Main V2 dihentikan karena Main V3 sedang berjalan.")
            if qr_running:
                stop_process(QR_STANDBY_PATH)
                send_telegram_message("QR standby dihentikan karena Main V3 sedang berjalan.")
            return True

        # Main V2 has second priority (fallback only if enabled)
        if main_v2_running:
            # Hentikan semua yang lain
            if main_running:
                stop_process(MAIN_PATH)
                send_telegram_message("Main detector dihentikan karena Main V2 sedang berjalan.")
            if qr_running:
                stop_process(QR_STANDBY_PATH)
                send_telegram_message("QR standby dihentikan karena Main V2 sedang berjalan.")
            return True
        
        # Main detector dan QR standby tidak bisa berjalan bersamaan
        if main_running and qr_running:
            # Konflik: kedua program berjalan bersamaan
            send_telegram_message("Konflik terdeteksi: Main detector dan QR standby berjalan bersamaan. Membersihkan...")
            stop_process(QR_STANDBY_PATH)  # Hentikan QR standby, biarkan main detector
            send_telegram_message("QR standby dihentikan. Main detector tetap berjalan.")
            return True
        elif main_running:
            # Main detector berjalan, pastikan QR standby tidak berjalan
            if qr_running:
                stop_process(QR_STANDBY_PATH)
                send_telegram_message("QR standby dihentikan karena main detector sedang berjalan.")
            return True
        elif qr_running:
            # QR standby berjalan, pastikan main detector tidak berjalan
            if main_running:
                stop_process(MAIN_PATH)
                send_telegram_message("Main detector dihentikan karena QR standby sedang berjalan.")
            return True
        
        return False
    except Exception as e:
        send_telegram_message(f"Error dalam cleanup: {str(e)}")
        return False

def get_last_state():
    """Read last state from state file and Google Sheets"""
    try:
        # Baca state file
        state = {}
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
        
        # Baca data terakhir dari Google Sheets
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = ServiceAccountCredentials.from_json_keyfile_name(CREDS_FILE, scope)
        gc = gspread.authorize(creds)
        sheet = gc.open_by_key(SHEET_ID)
        ws = sheet.worksheet(WORKSHEET_NAME)
        
        # Ambil data terakhir
        rows = ws.get_all_values()
        if len(rows) > 1:
            last_row = rows[-1]
            last_plate = last_row[0] if last_row[0] else "UNKNOWN"
            last_loading = int(last_row[4]) if len(last_row) > 4 and last_row[4].isdigit() else 0
            last_rehab = int(last_row[5]) if len(last_row) > 5 and last_row[5].isdigit() else 0
            return {
                'plate': last_plate,
                'loading': last_loading,
                'rehab': last_rehab,
                'state': state
            }
        else:
            return {
                'plate': "UNKNOWN",
                'loading': 0,
                'rehab': 0,
                'state': state
            }
    except Exception as e:
        print(f"Error getting last state: {e}")
        return {
            'plate': "UNKNOWN",
            'loading': 0,
            'rehab': 0,
            'state': {}
        }

def start_main_v2():
    """Start main_v2.py"""
    try:
        # Baca state terakhir untuk parameter
        last_state = get_last_state()
        
        # Pastikan QR standby tidak berjalan bersamaan
        if is_process_running(QR_STANDBY_PATH):
            stop_process(QR_STANDBY_PATH)
            time.sleep(2)

        # Path ke main_v2.py
        main_v2_cmd = [
            "python", MAIN_V2_PATH,
            "--source", "rtsp://foodinesia:tenggarong1@192.168.1.212:554/stream1",
            "--model", str((APP_DIR / "models" / "bestbaru4050.pt").resolve()),
            "--creds", str((APP_DIR / "credentials.json").resolve()),
            "--sheet_id", "1Ry_7xYxnt9wto83G4MVLiclB7mticgxVcjxnXaZGIQM",
            "--worksheet", "AUTO_ID",
            "--plate", last_state.get('plate', 'UNKNOWN'),
            "--notify_token", TELEGRAM_BOT_TOKEN,
            "--notify_chat_id", TELEGRAM_CHAT_ID,
            "--system_token", TELEGRAM_BOT_TOKEN,
            "--system_chat_id", TELEGRAM_CHAT_ID
        ]
        
        process = subprocess.Popen(main_v2_cmd, 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE, 
                                 text=True,
                                 encoding='utf-8',
                                 errors='replace',
                                 creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0)
        
        time.sleep(3)
        if process.poll() is None:
            print(f"Started main_v2.py with PID {process.pid}")
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Started main_v2.py with PID {process.pid}\n")
            send_telegram_message(f"Main V2 berhasil dijalankan (plat: {last_state.get('plate', 'UNKNOWN')}).")
            return True
        else:
            stdout, stderr = process.communicate()
            error_msg = stderr if stderr else stdout
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - main_v2.py exited immediately: {error_msg}\n")
            send_telegram_message(f"Main V2 gagal start: {error_msg[:200]}")
            return False
    except Exception as e:
        with open(MONITOR_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()} - Gagal start main_v2.py: {e}\n")
        send_telegram_message(f"Gagal start Main V2: {str(e)}")
        return False

def start_main_v3():
    """Start Main V3 (gui_version_partial module)"""
    try:
        # Load config for settings
        cfg = load_bot_config()
        last_state = get_last_state()

        # Stop conflicting processes
        if is_process_running(QR_STANDBY_PATH):
            stop_process(QR_STANDBY_PATH)
            time.sleep(2)
        if is_process_running(MAIN_V2_PATH):
            stop_process(MAIN_V2_PATH)
            time.sleep(2)

        # Build command for Main V3
        main_v3_cmd = [
            "python", "-m", MAIN_V3_MODULE,
            "--source", "rtsp://foodinesia:tenggarong1@192.168.1.212:554/stream1",
            "--model", str((APP_DIR / "models" / "bestbaru.engine").resolve()),
            "--creds", str((APP_DIR / "credentials.json").resolve()),
            "--sheet_id", "1Ry_7xYxnt9wto83G4MVLiclB7mticgxVcjxnXaZGIQM",
            "--worksheet", "AUTO_ID",
            "--plate", last_state.get('plate', 'UNKNOWN'),
            "--notify_token", TELEGRAM_BOT_TOKEN,
            "--notify_chat_id", TELEGRAM_CHAT_ID,
            "--conf", cfg.get("last_conf", "0.25"),
            "--iou", cfg.get("last_iou", "0.35")
        ]

        # Add V4 mode if enabled
        if cfg.get("v4_enabled", False):
            main_v3_cmd.append("--v4")

        process = subprocess.Popen(main_v3_cmd,
                                 stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE,
                                 text=True,
                                 encoding='utf-8',
                                 errors='replace',
                                 cwd=str(APP_DIR),
                                 creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0)

        time.sleep(3)
        if process.poll() is None:
            print(f"Started Main V3 with PID {process.pid}")
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Started Main V3 with PID {process.pid}\n")
            send_telegram_message(f"Main V3 berhasil dijalankan (plat: {last_state.get('plate', 'UNKNOWN')}).")
            return True
        else:
            stdout, stderr = process.communicate()
            error_msg = stderr if stderr else stdout
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Main V3 exited immediately: {error_msg}\n")
            send_telegram_message(f"Main V3 gagal start: {error_msg[:200]}")
            return False
    except Exception as e:
        with open(MONITOR_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now()} - Gagal start Main V3: {e}\n")
        send_telegram_message(f"Gagal start Main V3: {str(e)}")
        return False

def stop_main_v3():
    """Stop Main V3 (gui_version_partial)"""
    count = 0
    for pattern in ["src.detection.gui_version_partial.main", "gui_version_partial.main", "detector.py"]:
        if is_process_running(pattern):
            stop_process(pattern)
            count += 1
    return count > 0

def smart_restart():
    """Restart with last known state - Only restart if Auto Start is enabled"""
    try:
        # Check if auto restart is enabled
        auto_restart = is_auto_restart_enabled()
        if not auto_restart:
            # Auto restart disabled, don't do anything
            return False

        # Deteksi mode sistem saat ini
        current_mode = get_system_mode()

        # Deteksi program mana yang error
        qr_healthy, qr_reason = check_process_health(QR_STANDBY_PATH)
        main_healthy, main_reason = check_process_health(MAIN_PATH)
        main_v3_healthy = is_main_v3_running()  # V3 check

        # Baca state terakhir
        last_state = get_last_state()

        # Logika restart berdasarkan mode sistem
        if current_mode == "MAIN_V3":
            # Main V3 sedang berjalan, restart jika error
            if not main_v3_healthy:
                send_telegram_message(f"Main V3 error. Restarting...")
                stop_main_v3()
                time.sleep(3)
                if start_main_v3():
                    send_telegram_message("Main V3 berhasil direstart!")
                    return True
            else:
                # Main V3 sehat, tidak perlu restart
                return False

        elif current_mode == "MAIN_V2":
            # Main V2 is legacy, upgrade to V3
            send_telegram_message("Main V2 (legacy) detected. Upgrading to Main V3...")
            stop_process(MAIN_V2_PATH)
            time.sleep(3)
            if start_main_v3():
                send_telegram_message("Main V3 berhasil dijalankan!")
                return True
            return False

        elif current_mode == "MAIN_DETECTOR":
            # Main detector (legacy) sedang berjalan, upgrade to V3
            if not main_healthy:
                send_telegram_message(f"Main detector error: {main_reason}. Upgrading to Main V3...")
                stop_process(MAIN_PATH)
                time.sleep(3)
                if start_main_v3():
                    send_telegram_message("Main V3 berhasil dijalankan!")
                    return True
            else:
                return False

        elif current_mode == "QR_STANDBY":
            # QR standby sedang berjalan, hanya restart jika QR error
            if not qr_healthy:
                send_telegram_message(f"QR standby error: {qr_reason}. Restart QR standby...")
                stop_process(QR_STANDBY_PATH)
                time.sleep(3)
                if start_qr_standby():
                    send_telegram_message("QR standby berhasil direstart!")
                    return True
            else:
                return False

        elif current_mode == "NONE":
            # Tidak ada program yang berjalan, start Main V3
            send_telegram_message("Tidak ada program yang berjalan. Mencoba start Main V3...")
            if start_main_v3():
                send_telegram_message("Main V3 berhasil dijalankan!")
                return True

        return False
    except Exception as e:
        send_telegram_message(f"Error dalam smart restart: {str(e)}")
        return False

def start_main_with_state(state):
    """Start main detector with specific state"""
    try:
        cmd = MAIN_CMD.copy()
        cmd.extend(["--plate", state['plate']])
        
        process = subprocess.Popen(cmd, 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE, 
                                 text=True,
                                 encoding='utf-8',
                                 errors='replace',
                                 creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0)
        
        time.sleep(3)
        if process.poll() is None:
            print(f"Main detector started with plate {state['plate']}")
            return True
        else:
            stdout, stderr = process.communicate()
            print(f"Main detector failed to start: {stderr}")
            return False
    except Exception as e:
        print(f"Error starting main with state: {e}")
        return False

def handle_telegram_updates():
    last_report_time = time.time()
    last_check_time = time.time()
    last_status_notify_time = 0
    STATUS_NOTIFY_INTERVAL = 300  # Diubah ke 5 menit agar restart lebih sering jika gagal

    # Auto-start qr_standby saat bot dimulai, kalau belum jalan
    if not is_process_running(QR_STANDBY_PATH):
        send_telegram_message("🟢 Bot dimulai, otomatis start qr_standby.py karena belum berjalan.")
        start_qr_standby()
    else:
        send_telegram_message("🟢 Bot dimulai, qr_standby.py sudah berjalan.")
    # Kalau main sudah jalan, terminate dulu biar clean
    if is_process_running(MAIN_PATH):
        stop_process(MAIN_PATH)
        send_telegram_message("🟡 Bot dimulai, terminate icetube_main.py yang sudah berjalan untuk clean start.")

    print(f"Mencoba mengirim pesan awal ke chat_id {TELEGRAM_CHAT_ID}")
    if not send_telegram_message("🎉 CCTV Monitor Assistant dimulai! Saya akan memantau sistem QR Scan 24/7. Gunakan /help untuk perintah."):
        print("Gagal mengirim pesan awal. Periksa koneksi internet atau tambahkan bot ke chat.")

    with open(MONITOR_LOG, "a", encoding='utf-8') as f:
        f.write(f"{datetime.datetime.now()} - Telegram Monitor Bot dimulai dengan token {TELEGRAM_BOT_TOKEN}\n")

    offset = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates?offset={offset}"
            response = requests.get(url, timeout=10).json()

            if "result" in response:
                for update in response["result"]:
                    offset = update["update_id"] + 1
                    if "message" in update and "text" in update["message"]:
                        command = update["message"]["text"].lower()
                        chat_id = update["message"]["chat"]["id"]

                        if command == "/status":
                            status = get_system_status()
                            send_telegram_message(status)
                        elif command == "/restart":
                            send_telegram_message("🔄 Mencoba smart restart...")
                            if smart_restart():
                                send_telegram_message("✅ Smart restart berhasil!")
                            else:
                                send_telegram_message("❌ Smart restart gagal.")
                        elif command == "/restart_qr":
                            send_telegram_message("🔄 Restart QR standby...")
                            stop_process(QR_STANDBY_PATH)
                            time.sleep(2)
                            if start_qr_standby():
                                send_telegram_message("✅ QR standby restart berhasil!")
                            else:
                                send_telegram_message("❌ QR standby restart gagal.")
                        elif command == "/restart_main":
                            send_telegram_message("🔄 Restart main detector...")
                            last_state = get_last_state()
                            stop_process(MAIN_PATH)
                            time.sleep(2)
                            if start_main_with_state(last_state):
                                send_telegram_message(f"✅ Main detector restart berhasil dengan plat {last_state['plate']}!")
                            else:
                                send_telegram_message("❌ Main detector restart gagal.")
                        elif command == "/startmain":
                            send_telegram_message("🔄 Mencoba start icetube_main.py (mode plat UNKNOWN)...")
                            if not stop_process(QR_STANDBY_PATH):
                                send_telegram_message("⚠️ Warning: Gagal hentikan qr_standby.py (mungkin sudah mati atau tidak terdeteksi). Tetap lanjut start main.")
                            time.sleep(2)
                            if start_main():
                                send_telegram_message("✅ icetube_main.py berhasil dijalankan!")
                            else:
                                send_telegram_message("❌ Gagal start icetube_main.py. Cek log untuk detail.")
                        elif command == "/stopmain":
                            send_telegram_message("⏹️ Mencoba hentikan icetube_main.py...")
                            if stop_process(MAIN_PATH):
                                time.sleep(2)
                                if start_qr_standby():
                                    send_telegram_message("✅ icetube_main.py dihentikan, kembali ke qr_standby.py!")
                                else:
                                    send_telegram_message("❌ Gagal start qr_standby.py setelah hentikan main.")
                            else:
                                send_telegram_message("⚠️ Gagal hentikan icetube_main.py.")
                        elif command == "/statuspc":
                            pc_status = get_pc_status()
                            send_telegram_message(pc_status)
                        elif command == "/help":
                            help_text = (
                                "🤖 CCTV Monitor Assistant Commands:\n"
                                "- /status: Cek status sistem\n"
                                "- /restart: Smart restart (otomatis deteksi error)\n"
                                "- /restart_qr: Restart QR standby saja\n"
                                "- /restart_main: Restart main detector dengan state terakhir\n"
                                "- /startmain: Mulai icetube_main.py tanpa scan QR\n"
                                "- /stopmain: Hentikan icetube_main.py dan kembali ke QR\n"
                                "- /statuspc: Cek status PC (CPU, RAM, GPU)\n"
                                "- /help: Tampilkan bantuan ini\n\n"
                                "🔄 Smart Features:\n"
                                "- Auto detect not responding programs\n"
                                "- Auto restart dengan state terakhir\n"
                                "- Heartbeat monitoring setiap 30 detik\n"
                                "- Recovery dari Google Sheets data"
                            )
                            send_telegram_message(help_text)

            current_time = time.time()
            # Periodic update dihapus untuk mengurangi spam - hanya bisa dipanggil manual via /status
            # if current_time - last_report_time >= REPORT_INTERVAL:
            #     try:
            #         status = get_system_status()
            #         send_telegram_message(f"Update Berkala:\n{status}")
            #         with open(MONITOR_LOG, "a", encoding='utf-8') as f:
            #             f.write(f"{datetime.datetime.now()} - Update Berkala: {remove_emoji(status)}\n")
            #     except Exception as e:
            #         print(f"Error dalam periodic update: {e}")
            #     finally:
            #         last_report_time = current_time

            if current_time - last_check_time >= CHECK_INTERVAL:
                # Cleanup konflik process terlebih dahulu
                cleanup_conflicting_processes()
                
                # Enhanced monitoring dengan mode-aware health checks
                current_mode = get_system_mode()
                
                print(f"{datetime.datetime.now()} - System mode: {current_mode}")
                
                # Health check berdasarkan mode sistem
                if current_mode == "MAIN_V2":
                    # Main V2 mode: hanya check main_v2
                    main_v2_healthy, main_v2_reason = check_process_health(MAIN_V2_PATH)
                    
                    print(f"{datetime.datetime.now()} - Health check: Main V2={main_v2_healthy} ({main_v2_reason})")
                    
                    # Restart hanya jika main_v2 error
                    if not main_v2_healthy:
                        if current_time - last_status_notify_time >= STATUS_NOTIFY_INTERVAL:
                            if smart_restart():
                                send_telegram_message("🔄 Smart restart berhasil!")
                            else:
                                send_telegram_message("❌ Smart restart gagal!")
                            last_status_notify_time = current_time
                    else:
                        # Tulis heartbeat untuk main_v2
                        write_heartbeat("main_v2")
                        
                elif current_mode == "MAIN_DETECTOR":
                    # Main detector mode: hanya check main detector
                    main_healthy, main_reason = check_process_health(MAIN_PATH)
                    qr_healthy, qr_reason = True, "Main detector running, QR standby not needed"
                    
                    print(f"{datetime.datetime.now()} - Health check: Main={main_healthy} ({main_reason})")
                    
                    # Restart hanya jika main detector error
                    if not main_healthy:
                        if current_time - last_status_notify_time >= STATUS_NOTIFY_INTERVAL:
                            if smart_restart():
                                send_telegram_message("🔄 Smart restart berhasil!")
                            else:
                                send_telegram_message("❌ Smart restart gagal!")
                            last_status_notify_time = current_time
                    else:
                        # Tulis heartbeat untuk main detector
                        write_heartbeat("icetube_main")
                        
                elif current_mode == "QR_STANDBY":
                    # QR standby mode: hanya check QR standby
                    qr_healthy, qr_reason = check_process_health(QR_STANDBY_PATH)
                    main_healthy, main_reason = True, "QR standby running, Main detector not needed"
                    
                    print(f"{datetime.datetime.now()} - Health check: QR={qr_healthy} ({qr_reason})")
                    
                    # Restart hanya jika QR standby error
                    if not qr_healthy:
                        if current_time - last_status_notify_time >= STATUS_NOTIFY_INTERVAL:
                            if smart_restart():
                                send_telegram_message("🔄 Smart restart berhasil!")
                            else:
                                send_telegram_message("❌ Smart restart gagal!")
                            last_status_notify_time = current_time
                    else:
                        # Tulis heartbeat untuk QR standby
                        write_heartbeat("qr_standby")
                        
                else:
                    # Tidak ada program yang berjalan
                    print(f"{datetime.datetime.now()} - No programs running, attempting restart...")
                    if current_time - last_status_notify_time >= STATUS_NOTIFY_INTERVAL:
                        if smart_restart():
                            send_telegram_message("🔄 Smart restart berhasil!")
                        else:
                            send_telegram_message("❌ Smart restart gagal!")
                        last_status_notify_time = current_time
                
                last_check_time = current_time

            time.sleep(5)

        except Exception as e:
            print(f"Error in Telegram Monitor Bot: {e}")
            with open(MONITOR_LOG, "a", encoding='utf-8') as f:
                f.write(f"{datetime.datetime.now()} - Error: {e}\n")
            time.sleep(5)

if __name__ == "__main__":
    handle_telegram_updates()