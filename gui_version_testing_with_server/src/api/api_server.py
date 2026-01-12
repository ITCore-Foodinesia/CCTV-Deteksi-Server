"""
Enhanced API Server - Backend untuk Dashboard React
Menggabungkan streaming CCTV + detection dengan WebSocket real-time updates

Modules:
    - Stream Receivers (ZMQ, HTTP)
    - TUI Dashboard (Rich-based)
    - Google Sheets Integration (WebApp / gspread)
    - Telegram Integration
    - REST API & WebSocket endpoints
"""

# =============================================================================
# IMPORTS
# =============================================================================

# Standard library
import argparse
import atexit
import io
import json
import logging
import os
import queue
import sys
import threading
import time
from collections import deque
from datetime import datetime
from pathlib import Path

# Third-party
import cv2
import gspread
import numpy as np
import psutil
import requests
import zmq
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from oauth2client.service_account import ServiceAccountCredentials

# =============================================================================
# CONSTANTS
# =============================================================================

# Server configuration
API_PORT = 5001
ZMQ_DEFAULT_PORT = 5555
DEFAULT_HTTP_STREAM_URL = "http://localhost:5002/video_feed"
SHEETS_UPDATE_INTERVAL = 5  # seconds
PROCESS_MONITOR_INTERVAL = 3  # seconds

# Google Sheets
SHEETS_SCOPE = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/drive'
]

# Paths
CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "control_panel_config.json"

# Default values
DEFAULT_STATS = {
    'inbound': 0,
    'outbound': 0,
    'total': 0,
    'fps': 0,
    'plate': '...',
    'status': 'IDLE',
    'trucks': 0
}

DEFAULT_SHEETS_CACHE = {
    'latest_plate': '...',
    'latest_loading': 0,
    'latest_rehab': 0,
    'latest_driver': 'Driver',
    'latest_items': 'Items',
    'jam_datang': '',
    'jam_selesai': ''
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def safe_int(value, default=0):
    """
    Safely convert a value to integer.
    Handles strings, floats, None, and empty values.
    
    Args:
        value: Any value to convert
        default: Default value if conversion fails
    
    Returns:
        int: Converted integer or default
    """
    try:
        if value is None or value == '':
            return default
        return int(float(str(value)))
    except (ValueError, TypeError):
        return default


def build_sheets_cache(data, include_timestamp=True):
    """
    Build a standardized sheets data cache dictionary.
    
    Args:
        data: Source data dictionary
        include_timestamp: Whether to include last_update timestamp
    
    Returns:
        dict: Standardized sheets cache dictionary
    """
    cache = {
        'loading_count': data.get('loading_count', 0),
        'rehab_count': data.get('rehab_count', 0),
        'latest_plate': data.get('latest_plate', 'N/A'),
        'latest_loading': data.get('latest_loading', 0),
        'latest_rehab': data.get('latest_rehab', 0),
        'latest_driver': data.get('latest_driver', 'Driver'),
        'latest_items': data.get('latest_items', 'Items'),
        'jam_datang': data.get('jam_datang', ''),
        'jam_selesai': data.get('jam_selesai', '')
    }
    if include_timestamp:
        cache['last_update'] = time.time()
    return cache


def supports_websocket():
    """Check if WebSocket upgrades are supported."""
    try:
        import simple_websocket  # noqa: F401
        return True
    except ImportError:
        return False


def load_config():
    """
    Load configuration from JSON file.
    
    Returns:
        dict: Configuration dictionary or empty dict if not found
    """
    if not CONFIG_PATH.exists():
        return {}
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def get_active_profile(config):
    """
    Get the active profile from configuration.
    
    Args:
        config: Configuration dictionary
    
    Returns:
        dict: Active profile or empty dict
    """
    profiles = config.get("profiles", {})
    last_profile = config.get("last_profile", "")
    if last_profile and last_profile in profiles:
        return profiles[last_profile]
    return {}


# =============================================================================
# FLASK APP INITIALIZATION
# =============================================================================

app = Flask(__name__)
CORS(app)

ALLOW_WS_UPGRADES = supports_websocket()
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    allow_upgrades=ALLOW_WS_UPGRADES,
)

# =============================================================================
# GLOBAL STATE
# =============================================================================

# Telegram state
telegram_state = {
    "plate": None,
    "status": "IDLE",
    "operator": "-",
    "last_update": 0
}

# Google Sheets state
sheets_client = None
worksheet = None
sheets_connected = False
sheets_lock = threading.Lock()
WEBAPP_URL = os.getenv('WEBAPP_URL', '')

# Process monitoring state
process_status = {
    "detector": False,
    "scanner": False,
    "uploader": False,
    "bot": False
}

# Stream configuration (set by _create_stream_receiver)
STREAM_MODE = "zmq"
STREAM_URL = ""

# =============================================================================
# TUI COMPONENTS
# =============================================================================


class QueueWriter(io.TextIOBase):
    """Custom TextIO that writes to a queue for TUI display."""
    
    def __init__(self, message_queue, fallback_stream):
        super().__init__()
        self._queue = message_queue
        self._fallback = fallback_stream
        self._buffer = ""

    def write(self, s):
        if not s:
            return 0
        self._buffer += str(s)
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            line = line.rstrip("\r")
            if line:
                try:
                    self._queue.put_nowait(line)
                except Exception:
                    self._safe_fallback_write(line)
        return len(s)

    def flush(self):
        if self._buffer:
            line = self._buffer.rstrip("\r\n")
            self._buffer = ""
            if line:
                try:
                    self._queue.put_nowait(line)
                except Exception:
                    pass
        try:
            self._fallback.flush()
        except Exception:
            pass

    def _safe_fallback_write(self, line):
        """Safely write to fallback stream."""
        try:
            self._fallback.write(line + "\n")
            self._fallback.flush()
        except Exception:
            pass

    @property
    def encoding(self):
        return getattr(self._fallback, "encoding", "utf-8")

    def isatty(self):
        return getattr(self._fallback, "isatty", lambda: False)()


class QueueLogHandler(logging.Handler):
    """Logging handler that writes to a queue for TUI display."""
    
    def __init__(self, message_queue):
        super().__init__()
        self._queue = message_queue

    def emit(self, record):
        try:
            msg = self.format(record)
            if msg:
                self._queue.put_nowait(msg)
        except Exception:
            pass


class ConsoleTui:
    """Rich-based Terminal User Interface for server monitoring."""
    
    def __init__(self, stream, original_stdout):
        self.stream = stream
        self._original_stdout = original_stdout
        self._queue = queue.Queue(maxsize=2000)
        self._logs = deque(maxlen=120)
        self._stop = threading.Event()
        self._console = None
        self._rich_available = False

    @property
    def message_queue(self):
        return self._queue

    def start(self):
        """Start the TUI. Returns True if successful."""
        try:
            from rich.console import Console
            from rich.layout import Layout
            from rich.live import Live
            from rich.panel import Panel
            from rich.table import Table
            from rich.text import Text
        except ImportError:
            return False

        self._rich_available = True
        self._console = Console(file=self._original_stdout, force_terminal=True)
        
        threading.Thread(target=self._run_loop, daemon=True).start()
        return True

    def stop(self):
        """Stop the TUI."""
        self._stop.set()

    def _run_loop(self):
        """Main TUI render loop."""
        from rich.live import Live
        
        with Live(
            self._render(),
            console=self._console,
            refresh_per_second=6,
            screen=True
        ) as live:
            while not self._stop.is_set():
                self._drain_queue()
                live.update(self._render(), refresh=True)
                time.sleep(0.1)

    def _drain_queue(self, max_items=200):
        """Drain messages from queue to logs."""
        drained = 0
        while drained < max_items:
            try:
                line = self._queue.get_nowait()
                self._logs.append(line)
                drained += 1
            except queue.Empty:
                break

    def _render(self):
        """Render the TUI layout."""
        from rich.layout import Layout
        from rich.panel import Panel
        from rich.table import Table
        from rich.text import Text

        stats = dict(self.stream.stats or {})
        sheets_cache = self.stream.sheets_data_cache or {}
        last_update = sheets_cache.get("last_update", 0) or 0
        age = int(time.time() - last_update) if last_update else None

        # Status panel
        status_table = Table.grid(expand=True)
        status_table.add_column(ratio=1)
        status_table.add_column(ratio=1)
        status_table.add_row("Stream", str(self.stream.connection_status))
        status_table.add_row("Running", "Yes" if self.stream.running else "No")
        status_table.add_row("Detection", "On" if self.stream.detection_enabled else "Off")
        status_table.add_row("JPEG Q", str(self.stream.jpeg_quality))
        status_table.add_row("Frame Skip", str(self.stream.frame_skip))

        # Stats panel - use VALUES from latest row
        inbound = safe_int(sheets_cache.get("latest_loading", stats.get("inbound", 0)))
        outbound = safe_int(sheets_cache.get("latest_rehab", stats.get("outbound", 0)))
        
        stats_table = Table.grid(expand=True)
        stats_table.add_column(ratio=1)
        stats_table.add_column(ratio=1)
        stats_table.add_row("Inbound", str(inbound))
        stats_table.add_row("Outbound", str(outbound))
        stats_table.add_row("Trucks", str(stats.get("trucks", 0)))

        # Telegram / Sheets panel
        tg_status = telegram_state.get("status", "IDLE")
        tg_plate = telegram_state.get("plate")
        
        plate_style = "bold green" if tg_status in ["START", "STOP", "LOADING", "STOPPED", "READY"] else "white"
        display_plate = tg_plate if tg_plate and tg_plate != "UNKNOWN" else sheets_cache.get("latest_plate", "N/A")
        
        sheets_table = Table.grid(expand=True)
        sheets_table.add_column(ratio=1)
        sheets_table.add_column(ratio=1)
        sheets_table.add_row("Mode", "WebApp" if WEBAPP_URL else "gspread")
        sheets_table.add_row("Connected", "Yes" if sheets_connected else "No")
        sheets_table.add_row("Last Update", f"{age}s ago" if age is not None else "N/A")
        sheets_table.add_row("Latest Plate", Text(str(display_plate), style=plate_style))
        sheets_table.add_row("Loading Status", str(tg_status))

        # Header
        header = Text("CCTV API Server (TUI)", style="bold")
        header.append(f"  |  API: http://localhost:{API_PORT}  |  WS: ws://localhost:{API_PORT}")
        header.append("  |  Ctrl+C to stop")

        # Layout
        top = Table.grid(expand=True)
        top.add_column(ratio=1)
        top.add_column(ratio=1)
        top.add_column(ratio=1)
        top.add_row(
            Panel(status_table, title="Status", border_style="cyan"),
            Panel(stats_table, title="Stats", border_style="green"),
            Panel(sheets_table, title="Telegram / Sheets", border_style="magenta"),
        )

        logs_text = "\n".join(list(self._logs)[-40:]) if self._logs else ""
        logs_panel = Panel(Text(logs_text), title="Logs", border_style="yellow")

        layout = Layout()
        layout.split_column(
            Layout(Panel(header), size=3),
            Layout(top, size=11),
            Layout(logs_panel, ratio=1),
        )
        return layout


def enable_tui(stream):
    """
    Enable TUI mode if Rich is available.
    
    Args:
        stream: Stream receiver instance
    
    Returns:
        ConsoleTui or None: TUI instance if enabled, None otherwise
    """
    original_stdout = sys.stdout
    original_stderr = sys.stderr
    tui = ConsoleTui(stream=stream, original_stdout=original_stdout)

    if not tui.start():
        return None

    # Redirect stdout/stderr to TUI
    sys.stdout = QueueWriter(tui.message_queue, original_stdout)
    sys.stderr = QueueWriter(tui.message_queue, original_stderr)

    # Setup logging handler
    handler = QueueLogHandler(tui.message_queue)
    handler.setFormatter(logging.Formatter("[%(levelname)s] %(name)s: %(message)s"))
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
    logging.getLogger("werkzeug").setLevel(logging.INFO)

    try:
        tui.message_queue.put_nowait("TUI enabled. Logs will appear below.")
    except Exception:
        pass

    def cleanup():
        try:
            tui.stop()
            root_logger.removeHandler(handler)
        finally:
            sys.stdout = original_stdout
            sys.stderr = original_stderr

    atexit.register(cleanup)
    return tui


# =============================================================================
# STREAM RECEIVERS
# =============================================================================


class BaseStreamReceiver:
    """Base class for stream receivers with common functionality."""
    
    def __init__(self):
        self.frame = None
        self.running = False
        self.lock = threading.Lock()
        self.last_frame_time = 0
        self.detection_enabled = True
        self.jpeg_quality = 65
        self.frame_skip = 0
        self.connection_status = "Offline"
        self.stats = dict(DEFAULT_STATS)
        self.sheets_data_cache = dict(DEFAULT_SHEETS_CACHE)
        self.activity_logs = deque(maxlen=5)
        self._thread = None

    def start(self):
        """Start the receiver."""
        if self.running:
            return True
        self.running = True
        self._thread = threading.Thread(target=self._receive_loop, daemon=True)
        self._thread.start()
        return True

    def stop(self):
        """Stop the receiver."""
        self.running = False
        self.connection_status = "Stopped"
        if self._thread and self._thread.is_alive():
            try:
                self._thread.join(timeout=1.0)
            except Exception:
                pass

    def get_frame(self, with_detection=True):
        """Get the current frame."""
        with self.lock:
            return self.frame

    def _receive_loop(self):
        """Override in subclass."""
        raise NotImplementedError


class ZMQStreamReceiver(BaseStreamReceiver):
    """ZMQ-based stream receiver for high-performance video streaming."""
    
    def __init__(self, zmq_port=ZMQ_DEFAULT_PORT):
        super().__init__()
        self.zmq_port = zmq_port
        self.connection_status = "Waiting for Data..."

    def _receive_loop(self):
        context = zmq.Context()
        socket = context.socket(zmq.SUB)
        socket.setsockopt_string(zmq.SUBSCRIBE, "")
        
        try:
            socket.connect(f"tcp://localhost:{self.zmq_port}")
            print(f"[ZMQ Receiver] Connected to port {self.zmq_port}")
        except Exception as e:
            print(f"[ZMQ Receiver] Connect error: {e}")

        while self.running:
            try:
                if socket.poll(100):
                    topic = socket.recv_string()
                    if topic == "video":
                        frame_data = socket.recv()
                        with self.lock:
                            self.frame = frame_data
                            self.last_frame_time = time.time()
                            self.connection_status = "Connected"
                    elif topic == "stats":
                        stats_json = socket.recv_json()
                        with self.lock:
                            self.stats.update(stats_json)
                else:
                    self.connection_status = "Waiting for Data..."
            except Exception:
                time.sleep(0.1)
        
        socket.close()
        context.term()
        self.connection_status = "Stopped"


class HTTPStreamReceiver(BaseStreamReceiver):
    """HTTP MJPEG stream receiver."""
    
    def __init__(self, stream_url=DEFAULT_HTTP_STREAM_URL):
        super().__init__()
        self.stream_url = stream_url

    def _receive_loop(self):
        print(f"[HTTP Receiver] Watching {self.stream_url}")
        
        while self.running:
            try:
                response = requests.get(self.stream_url, stream=True, timeout=5)
                self.connection_status = "Connected"
                bytes_data = b''
                
                for chunk in response.iter_content(chunk_size=1024):
                    if not self.running:
                        break
                    bytes_data += chunk
                    
                    # Find JPEG markers
                    start = bytes_data.find(b'\xff\xd8')  # SOI
                    end = bytes_data.find(b'\xff\xd9')    # EOI
                    
                    if start != -1 and end != -1:
                        jpg = bytes_data[start:end + 2]
                        bytes_data = bytes_data[end + 2:]
                        with self.lock:
                            self.frame = jpg
                            self.last_frame_time = time.time()
            except Exception:
                self.connection_status = "Offline"
                time.sleep(2)


def create_stream_receiver():
    """
    Create appropriate stream receiver based on configuration.
    
    Returns:
        BaseStreamReceiver: Configured stream receiver instance
    """
    global STREAM_MODE, STREAM_URL
    
    # Check environment variables first
    mode = os.getenv("ICETUBE_STREAM_MODE", "").strip().lower()
    stream_url = os.getenv("ICETUBE_STREAM_URL", "").strip()
    
    # Fallback to config file
    if not mode:
        config = load_config()
        mode = str(config.get("stream_mode", "")).strip().lower()
        stream_url = str(config.get("stream_url", stream_url)).strip()
    
    if mode == "zmq":
        STREAM_MODE = "zmq"
        STREAM_URL = f"tcp://localhost:{ZMQ_DEFAULT_PORT}"
        return ZMQStreamReceiver(zmq_port=ZMQ_DEFAULT_PORT)
    
    # Default to HTTP
    STREAM_MODE = "http"
    STREAM_URL = stream_url or DEFAULT_HTTP_STREAM_URL
    return HTTPStreamReceiver(stream_url=STREAM_URL)


# Create global stream instance
stream = create_stream_receiver()


# =============================================================================
# VIDEO FRAME GENERATORS
# =============================================================================


def generate_video_frames():
    """Generate MJPEG frames for video streaming."""
    print("DEBUG: Client connected to video stream")
    last_yield_time = 0
    
    while True:
        current_frame_time = stream.last_frame_time
        if current_frame_time > last_yield_time:
            frame_bytes = stream.get_frame()
            if frame_bytes:
                last_yield_time = current_frame_time
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n'
                    b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' +
                    frame_bytes + b'\r\n'
                )
        time.sleep(0.01)


def generate_placeholder_frames(with_detection=True):
    """Generate frames with placeholder for loading state."""
    # Create empty frame
    empty_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(
        empty_frame, "Loading / Reconnecting...",
        (160, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2
    )
    _, encoded_empty = cv2.imencode('.jpg', empty_frame)
    empty_bytes = encoded_empty.tobytes()
    
    # Yield initial placeholder
    yield (b'--frame\r\n'
           b'Content-Type: image/jpeg\r\n\r\n' + empty_bytes + b'\r\n')

    while True:
        try:
            frame = stream.get_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.04)
        except Exception as e:
            print(f"Error in generate_frames: {e}")
            time.sleep(1)


# =============================================================================
# GOOGLE SHEETS INTEGRATION
# =============================================================================


def connect_google_sheets():
    """
    Connect to Google Sheets using service account credentials.
    
    Returns:
        bool: True if connected successfully
    """
    global sheets_client, worksheet
    
    try:
        config = load_config()
        profile = get_active_profile(config)
        
        if not profile:
            print("No valid profile found")
            return False
        
        creds_path = profile.get("creds")
        sheet_id = profile.get("sheet_id")
        worksheet_name = profile.get("worksheet", "AUTO_ID")
        
        if not creds_path or not sheet_id:
            print("Missing credentials or sheet_id in config")
            return False
        
        if not os.path.exists(creds_path):
            print(f"Credentials file not found: {creds_path}")
            return False
        
        print("Connecting to Google Sheets...")
        creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, SHEETS_SCOPE)
        sheets_client = gspread.authorize(creds)
        
        sheet = sheets_client.open_by_key(sheet_id)
        worksheet = sheet.worksheet(worksheet_name)
        
        print(f"Google Sheets connected! Worksheet: {worksheet_name}")
        return True
        
    except Exception as e:
        print(f"Error connecting to Google Sheets: {e}")
        return False


def fetch_from_webapp():
    """
    Fetch data from Google Apps Script Web App.
    
    Returns:
        dict or None: Data dictionary or None if failed
    """
    if not WEBAPP_URL:
        return None
    
    try:
        print(f"Fetching data from Web App: {WEBAPP_URL}")
        response = requests.get(WEBAPP_URL, timeout=10)
        
        if response.status_code != 200:
            print(f"Web App returned status: {response.status_code}")
            return None
        
        data = response.json()
        
        if data.get('status') != 'success':
            print(f"Web App error: {data.get('message', 'Unknown error')}")
            return None
        
        webapp_data = data.get('data', {})
        
        return {
            'loading_count': webapp_data.get('loading_count', 0),
            'rehab_count': webapp_data.get('rehab_count', 0),
            'latest_plate': webapp_data.get('latest_plate', 'N/A'),
            'latest_loading': webapp_data.get('latest_loading', 0),
            'latest_rehab': webapp_data.get('latest_rehab', 0),
            'jam_datang': webapp_data.get('jam_datang', ''),
            'jam_selesai': webapp_data.get('jam_selesai', ''),
            'total_records': webapp_data.get('total_records', 0),
            'tanggal': webapp_data.get('tanggal', ''),
            'kloter': webapp_data.get('kloter', '')
        }
        
    except Exception as e:
        print(f"Error fetching from Web App: {e}")
        return None


def fetch_from_gspread():
    """
    Fetch data directly from Google Sheets using gspread.
    
    Returns:
        dict or None: Data dictionary or None if failed
    """
    if not worksheet:
        return None
    
    try:
        with sheets_lock:
            records = worksheet.get_all_records()
            
            if not records:
                return None
            
            def parse_number(value):
                if isinstance(value, (int, float)):
                    return float(value)
                text = str(value).strip().replace(",", ".")
                if not text:
                    return None
                try:
                    return float(text)
                except ValueError:
                    return None

            def sum_or_count(key):
                total = 0.0
                nonempty_count = 0
                has_numeric = False
                
                for row in records:
                    value = row.get(key)
                    if value is None:
                        continue
                    number = parse_number(value)
                    if number is None:
                        if str(value).strip():
                            nonempty_count += 1
                    else:
                        has_numeric = True
                        total += number
                
                if has_numeric:
                    return int(total) if total.is_integer() else total
                return nonempty_count

            loading_count = sum_or_count('Loading')
            rehab_count = sum_or_count('Rehab')
            
            # Find latest entry with Plat
            latest_plate = 'N/A'
            jam_datang = ''
            jam_selesai = ''
            
            for record in reversed(records):
                plat = record.get('Plat', '')
                if plat and str(plat).strip():
                    latest_plate = str(plat).strip()
                    jam_datang = str(record.get('Jam Datang', ''))
                    jam_selesai = str(record.get('Jam Selesai', ''))
                    break
            
            return {
                'loading_count': loading_count,
                'rehab_count': rehab_count,
                'latest_plate': latest_plate,
                'jam_datang': jam_datang,
                'jam_selesai': jam_selesai,
                'total_records': len(records)
            }
            
    except Exception as e:
        print(f"Error fetching sheets data: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_sheets_data():
    """
    Fetch data from Google Sheets (Web App or gspread).
    
    Returns:
        dict or None: Data dictionary or None if failed
    """
    if WEBAPP_URL:
        return fetch_from_webapp()
    return fetch_from_gspread()


def update_stream_from_sheets_data(data):
    """
    Update stream stats and cache from sheets data.
    
    Args:
        data: Sheets data dictionary
    """
    stream.stats['inbound'] = safe_int(data.get('latest_loading', 0))
    stream.stats['outbound'] = safe_int(data.get('latest_rehab', 0))
    stream.sheets_data_cache = build_sheets_cache(data)
    
    socketio.emit('stats_update', stream.stats)
    socketio.emit('sheets_update', stream.sheets_data_cache)


# =============================================================================
# BACKGROUND THREADS
# =============================================================================


def sheets_update_loop():
    """Background thread to fetch sheets data periodically."""
    global sheets_connected
    
    while True:
        try:
            data = fetch_sheets_data()
            if data:
                sheets_connected = True
                update_stream_from_sheets_data(data)
        except Exception as e:
            print(f"Error in sheets update loop: {e}")
        
        time.sleep(SHEETS_UPDATE_INTERVAL)


def process_monitor_loop():
    """Background thread to monitor modular processes."""
    global process_status
    
    process_patterns = {
        "detector": ["detector.py", "gui_version_partial.main"],
        "scanner": ["scanner.py"],
        "uploader": ["uploader.py"],
        "bot": ["telegram_loading_dashboard.py"]
    }
    
    while True:
        try:
            status = {key: False for key in process_patterns}
            
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = proc.info.get('cmdline')
                    if not cmdline:
                        continue
                    cmd_str = " ".join(cmdline).lower()
                    
                    for key, patterns in process_patterns.items():
                        if any(pattern in cmd_str for pattern in patterns):
                            status[key] = True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            process_status = status
            socketio.emit('process_status', process_status)
        except Exception as e:
            print(f"Error in process monitor: {e}")
        
        time.sleep(PROCESS_MONITOR_INTERVAL)


# =============================================================================
# REST API ROUTES - STREAM
# =============================================================================


@app.route('/api/stream/video')
def video_feed():
    """Video streaming endpoint."""
    return Response(
        generate_video_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/api/stream/video_raw')
def video_feed_raw():
    """Raw video streaming without detection overlay."""
    return Response(
        generate_placeholder_frames(with_detection=False),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/api/stream/start')
def start_stream():
    """Start streaming."""
    if stream.start():
        return jsonify({'status': 'success', 'message': 'Streaming started'})
    return jsonify({'status': 'error', 'message': 'Failed to start stream'}), 500


@app.route('/api/stream/stop')
def stop_stream():
    """Stop streaming."""
    stream.stop()
    return jsonify({'status': 'success', 'message': 'Streaming stopped'})


# =============================================================================
# REST API ROUTES - STATUS & STATS
# =============================================================================


@app.route('/api/status')
def get_status():
    """Get stream status."""
    return jsonify({
        'status': stream.connection_status,
        'running': stream.running,
        'last_frame': time.time() - stream.last_frame_time if stream.frame else None,
        'fps': stream.stats.get('fps', 0),
        'latency': stream.stats.get('latency', 0),
        'stream_mode': STREAM_MODE,
        'stream_url': STREAM_URL
    })


@app.route('/api/stats')
def get_stats():
    """Get warehouse stats."""
    return jsonify(stream.stats)


@app.route('/api/activities')
def get_activities():
    """Get activity logs."""
    return jsonify(list(stream.activity_logs))


@app.route('/api/processes')
def get_processes():
    """Get status of modular processes."""
    return jsonify(process_status)


# =============================================================================
# REST API ROUTES - SETTINGS
# =============================================================================


@app.route('/api/settings')
def get_settings():
    """Get current settings."""
    return jsonify({
        'frame_skip': stream.frame_skip,
        'jpeg_quality': stream.jpeg_quality,
        'detection_enabled': stream.detection_enabled
    })


@app.route('/api/settings/quality/<int:quality>')
def set_quality(quality):
    """Set JPEG quality (30-95)."""
    if 30 <= quality <= 95:
        stream.jpeg_quality = quality
        return jsonify({'status': 'success', 'quality': quality})
    return jsonify({'status': 'error', 'message': 'Quality must be between 30-95'}), 400


@app.route('/api/settings/frameskip/<int:skip>')
def set_frame_skip(skip):
    """Set frame skip (1-5)."""
    if 1 <= skip <= 5:
        stream.frame_skip = skip
        return jsonify({'status': 'success', 'frame_skip': skip})
    return jsonify({'status': 'error', 'message': 'Frame skip must be between 1-5'}), 400


@app.route('/api/settings/detection/<int:enabled>')
def set_detection(enabled):
    """Enable/disable detection overlay."""
    stream.detection_enabled = bool(enabled)
    return jsonify({'status': 'success', 'detection_enabled': stream.detection_enabled})


# =============================================================================
# REST API ROUTES - GOOGLE SHEETS
# =============================================================================


@app.route('/api/sheets/status')
def sheets_status():
    """Get Google Sheets connection status."""
    connected = worksheet is not None
    return jsonify({
        'connected': connected,
        'last_update': stream.sheets_data_cache.get('last_update', 0),
        'data': stream.sheets_data_cache if connected else None
    })


@app.route('/api/sheets/refresh')
def sheets_refresh():
    """Manually refresh sheets data."""
    data = fetch_sheets_data()
    if data:
        update_stream_from_sheets_data(data)
        return jsonify({'status': 'success', 'data': data})
    return jsonify({'status': 'error', 'message': 'Failed to fetch data'}), 500


@app.route('/api/sheets/reconnect')
def sheets_reconnect():
    """Reconnect to Google Sheets."""
    if connect_google_sheets():
        return jsonify({'status': 'success', 'message': 'Reconnected to Google Sheets'})
    return jsonify({'status': 'error', 'message': 'Failed to connect'}), 500


@app.route('/api/sheets/webhook', methods=['POST'])
def sheets_webhook():
    """Webhook endpoint for Google Apps Script push notifications."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        print(f"Webhook received from Apps Script: {data}")
        
        # Update stats
        if 'loading_count' in data:
            stream.stats['inbound'] = data['loading_count']
        if 'rehab_count' in data:
            stream.stats['outbound'] = data['rehab_count']
        
        # Update cache
        stream.sheets_data_cache = build_sheets_cache(data)
        
        # Broadcast updates
        socketio.emit('stats_update', stream.stats)
        socketio.emit('sheets_update', stream.sheets_data_cache)
        
        print(f"Stats updated - Inbound: {stream.stats['inbound']}, Outbound: {stream.stats['outbound']}")
        print(f"Latest plate: {stream.sheets_data_cache['latest_plate']}")
        
        return jsonify({
            'status': 'success',
            'message': 'Data received and broadcasted',
            'data': stream.sheets_data_cache
        })
        
    except Exception as e:
        print(f"Error in webhook: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# =============================================================================
# REST API ROUTES - TELEGRAM
# =============================================================================


@app.route('/api/telegram_update', methods=['POST'])
def telegram_update():
    """Update status from Telegram Bot."""
    global telegram_state
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data"}), 400
        
        telegram_state["plate"] = data.get("plate", "UNKNOWN")
        telegram_state["status"] = data.get("status", "IDLE")
        telegram_state["last_update"] = time.time()
        
        source = data.get("source", "telegram")
        print(f"📢 [TELEGRAM] Update received: {telegram_state['status']} for {telegram_state['plate']} (from {source})")
        
        socketio.emit('telegram_status', telegram_state)
        
        return jsonify({"status": "success", "data": telegram_state})
    except Exception as e:
        print(f"Error in telegram_update: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/state', methods=['GET'])
def get_telegram_state():
    """Get current Telegram state (for Detector polling)."""
    return jsonify(telegram_state)


# =============================================================================
# WEBSOCKET EVENTS
# =============================================================================


@socketio.on('connect')
def handle_connect(auth=None):
    """Handle client connection."""
    print(f'Client connected: {request.sid}')
    emit('status_update', {'status': stream.connection_status})
    emit('stats_update', stream.stats)
    emit('activities_update', list(stream.activity_logs))


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    print(f'Client disconnected: {request.sid}')


@socketio.on('request_stats')
def handle_request_stats():
    """Handle stats request."""
    emit('stats_update', stream.stats)


@socketio.on('request_activities')
def handle_request_activities():
    """Handle activities request."""
    emit('activities_update', list(stream.activity_logs))


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================


def main():
    """Main entry point for the API server."""
    global WEBAPP_URL, sheets_connected
    
    # Parse arguments
    parser = argparse.ArgumentParser(description="Enhanced API Server (React Dashboard Backend)")
    parser.add_argument(
        "--tui",
        action="store_true",
        help="Show a PowerShell TUI dashboard (requires 'rich').",
    )
    args = parser.parse_args()

    # Enable TUI if requested
    tui = enable_tui(stream) if args.tui else None
    if args.tui and tui is None:
        print("TUI requested but 'rich' is not available. Install it with: pip install rich")

    # Print banner
    print("=" * 60)
    print("Enhanced API Server - Dashboard React Backend")
    print("=" * 60)
    print()

    if not ALLOW_WS_UPGRADES:
        print("WebSocket upgrades disabled (install simple-websocket to enable).")
        print()

    # Start stream receiver
    if STREAM_MODE == "http":
        print(f"Starting HTTP Receiver (Main V3) -> {STREAM_URL}")
    else:
        print(f"Starting ZMQ Relay (waiting for Main V2) -> {STREAM_URL}")
    
    if stream.start():
        print("Stream receiver started!")
    else:
        print("Failed to start stream receiver.")

    # Load Web App URL from config
    try:
        config = load_config()
        profile = get_active_profile(config)
        WEBAPP_URL = profile.get('webapp_url', '') or config.get('webapp_url', '')
        if WEBAPP_URL:
            print(f"Web App URL loaded: {WEBAPP_URL[:50]}...")
    except Exception as e:
        print(f"Note: No Web App URL in config: {e}")

    # Connect to Google Sheets
    print()
    sheets_connected = False
    
    if WEBAPP_URL:
        print("Using Google Apps Script Web App for data")
        print("Testing Web App connection...")
        test_data = fetch_from_webapp()
        if test_data:
            print("Web App connected successfully!")
            sheets_connected = True
        else:
            print("Failed to connect to Web App. Check URL and deployment.")
    else:
        print("No Web App URL configured. Trying gspread...")
        if connect_google_sheets():
            print("Google Sheets connected successfully (gspread)!")
            sheets_connected = True
        else:
            print("Failed to connect to Google Sheets.")

    # Start background threads
    if sheets_connected:
        threading.Thread(target=sheets_update_loop, daemon=True).start()
        print("Google Sheets live update started!")
    else:
        print("Will run without live data from Google Sheets.")

    threading.Thread(target=process_monitor_loop, daemon=True).start()
    print("Process monitoring started!")

    # Print server info
    print()
    print("Server Information:")
    print(f"  - API Endpoint: http://localhost:{API_PORT}")
    print(f"  - Video Feed: http://localhost:{API_PORT}/api/stream/video")
    print(f"  - WebSocket: ws://localhost:{API_PORT}")
    print(f"  - Google Sheets: {'Connected' if worksheet else 'Disconnected'}")
    print(f"  - Stream Source: {STREAM_MODE.upper()} ({STREAM_URL})")
    print()
    print("React Dashboard:")
    print("  - Development: http://localhost:5173")
    print(f"  - Configure API URL in dashboard to: http://localhost:{API_PORT}")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 60)

    # Start server
    socketio.run(app, host='0.0.0.0', port=API_PORT, debug=False, allow_unsafe_werkzeug=True)


if __name__ == '__main__':
    main()
