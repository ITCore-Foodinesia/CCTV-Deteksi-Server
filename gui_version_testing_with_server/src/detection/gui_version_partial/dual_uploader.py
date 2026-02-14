"""
Dual Uploader for CCTV Detection Engine

Writes detection counts to BOTH:
1. Google Sheets (existing flow)
2. Supabase (new flow for Flutter integration)

ELI5: This is like a secretary that writes the same report to two different notebooks
at the same time - one for the old system (Sheets) and one for the new app (Supabase).
"""

import time
import threading
import queue
import datetime
import logging
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('DualUploader')

# Google Sheets imports
try:
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    GSPREAD_AVAILABLE = True
except ImportError:
    logger.warning("gspread not installed. Google Sheets integration disabled.")
    GSPREAD_AVAILABLE = False

# Supabase imports
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    logger.warning("supabase-py not installed. Supabase integration disabled.")
    SUPABASE_AVAILABLE = False
    Client = None

# Telegram
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

from .shared import DetectionPayload, ControlEvent, PROC_UPLOADER

# Load env
try:
    from dotenv import load_dotenv
    import os
    load_dotenv()
except ImportError:
    pass


def log_debug(msg):
    """Debug logging to file."""
    try:
        with open("uploader_debug.log", "a") as f:
            f.write(f"{datetime.datetime.now()} [{PROC_UPLOADER}] {msg}\n")
    except:
        pass


# === GOOGLE SHEETS HELPERS (from original uploader.py) ===
def get_worksheet_safe(gc, sheet_id, worksheet_name):
    try:
        sh = gc.open_by_key(sheet_id)
        try:
            ws = sh.worksheet(worksheet_name)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=worksheet_name, rows=1000, cols=10)
            ws.append_row(["Plat", "Tanggal", "Jam Datang", "Jam Selesai", "Loading", "Rehab", "Kloter"])
        return ws
    except Exception as e:
        logger.error(f"Error opening worksheet: {e}")
        raise e


def find_row_for_plate(ws, plate, today_str):
    try:
        rows = ws.get_all_values()
        if rows:
            for i, row in enumerate(rows[1:], start=2):
                if len(row) >= 4 and row[0] == plate and row[1] == today_str and not row[3]:
                    return i
    except Exception as e:
        logger.error(f"Error finding row: {e}")
    return None


def calculate_kloter(ws, plate, today_str):
    try:
        rows = ws.get_all_values()
        count = 0
        if rows:
            for row in rows[1:]:
                if len(row) >= 2 and row[0] == plate and row[1] == today_str:
                    count += 1
        return count + 1
    except Exception as e:
        logger.error(f"Error calc kloter: {e}")
        return 1


def send_telegram_message(message, token, chat_id):
    if not token or not chat_id or not REQUESTS_AVAILABLE:
        return
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        data = {"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}
        requests.post(url, data=data, timeout=5)
    except Exception as e:
        logger.warning(f"Telegram fail: {e}")


class DualUploaderThread(threading.Thread):
    """
    Uploader that writes to both Google Sheets and Supabase.
    
    Maintains backward compatibility with existing Sheets workflow
    while adding Supabase integration for Flutter app.
    """
    
    def __init__(
        self,
        config,
        input_queue: queue.Queue,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        session_manager=None
    ):
        super().__init__(daemon=True)
        self.config = config
        self.input_queue = input_queue
        self.session_manager = session_manager
        self.running = True
        self.name = "DualUploaderThread"
        
        # Sheets state
        self.current_row_idx = None
        self.current_plate_in_row = None
        
        # Supabase client
        self._supabase: Optional[Client] = None
        self._supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self._supabase_key = supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        
        if SUPABASE_AVAILABLE and self._supabase_url and self._supabase_key:
            try:
                self._supabase = create_client(self._supabase_url, self._supabase_key)
                logger.info(f"Supabase client initialized for uploader")
            except Exception as e:
                logger.error(f"Failed to init Supabase: {e}")
    
    def run(self):
        logger.info("DualUploaderThread Started")
        
        # 1. Setup Google Sheets
        gc = None
        ws = None
        
        if GSPREAD_AVAILABLE and self.config.creds and self.config.sheet_id:
            scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
            
            # Try connecting to Sheets (Non-blocking / Limited Retries)
            max_retries = 3
            for attempt in range(max_retries):
                if not self.running: break
                try:
                    log_debug(f"Connecting to Sheets (Attempt {attempt+1}/{max_retries}): {self.config.sheet_id}")
                    creds = ServiceAccountCredentials.from_json_keyfile_name(self.config.creds, scope)
                    gc = gspread.authorize(creds)
                    ws = get_worksheet_safe(gc, self.config.sheet_id, self.config.worksheet or "FIX")
                    logger.info(f"Connected to Google Sheets: {self.config.worksheet}")
                    break
                except Exception as e:
                    log_debug(f"Sheets connection failed: {e}")
                    if attempt < max_retries - 1:
                        logger.warning(f"Sheets connection failed, retrying in 2s: {e}")
                        time.sleep(2)
                    else:
                        logger.error(f"GIVING UP on Google Sheets after {max_retries} attempts. Continuing with Supabase only.")
                        ws = None
        else:
            logger.info("Google Sheets disabled (missing config or library)")
        
        # 2. Main Loop
        while self.running:
            try:
                try:
                    item = self.input_queue.get(timeout=1.0)
                except queue.Empty:
                    continue
                
                if isinstance(item, ControlEvent):
                    if item.command == "STOP":
                        break
                    continue
                
                if isinstance(item, DetectionPayload):
                    log_debug(f"Processing: {item.kloter} for {item.plate}")
                    
                    # Write to BOTH destinations
                    if ws:
                        self._process_sheets(ws, item)
                    
                    if self._supabase:
                        self._process_supabase(item)
                
                self.input_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error in uploader loop: {e}")
                time.sleep(1)
        
        logger.info("DualUploaderThread stopped")
    
    def _process_sheets(self, ws, item: DetectionPayload):
        """Process payload for Google Sheets (original logic)."""
        dt = datetime.datetime.fromtimestamp(item.timestamp)
        timestamp_str = dt.strftime("%H:%M:%S")
        
        # Operational Date Logic (Shift starts at 4 AM)
        dt_shift = dt - datetime.timedelta(hours=4)
        date_str = dt_shift.strftime("%Y-%m-%d")
        
        if item.kloter == "QR_START":
            msg = f"🔔 *SCAN BERHASIL*\nPlat: `{item.plate}`\nStatus: Siap Menghitung..."
            send_telegram_message(msg, self.config.notify_token, self.config.notify_chat_id)
            
            try:
                row_idx = find_row_for_plate(ws, item.plate, date_str)
                if row_idx is None:
                    kloter = calculate_kloter(ws, item.plate, date_str)
                    row_data = [item.plate, date_str, timestamp_str, "", 0, 0, kloter]
                    
                    try:
                        col_a = ws.col_values(1)
                        next_row = len(col_a) + 1
                        if next_row < 2:
                            next_row = 2
                        
                        range_name = f"A{next_row}:G{next_row}"
                        ws.update(range_name, [row_data])
                        log_debug(f"Row written to {range_name}")
                    except Exception as e:
                        log_debug(f"Explicit update failed: {e}")
                        ws.append_row(row_data)
                    
                    logger.info(f"[Sheets] New row for {item.plate}")
                    self.current_row_idx = find_row_for_plate(ws, item.plate, date_str)
                else:
                    self.current_row_idx = row_idx
                    logger.info(f"[Sheets] Using existing row {row_idx}")
                
                self.current_plate_in_row = item.plate
            except Exception as e:
                logger.error(f"[Sheets] Error QR_START: {e}")
        
        elif item.kloter == "SESSION_END":
            msg = f"✅ *SESI SELESAI*\nPlat: `{item.plate}`"
            send_telegram_message(msg, self.config.notify_token, self.config.notify_chat_id)
            
            if self.current_row_idx and self.current_plate_in_row == item.plate:
                try:
                    ws.update_cell(self.current_row_idx, 4, timestamp_str)
                    ws.update_cell(self.current_row_idx, 5, item.loading)
                    ws.update_cell(self.current_row_idx, 6, item.rehab)
                    logger.info(f"[Sheets] Finalized row {self.current_row_idx}")
                except Exception as e:
                    logger.error(f"[Sheets] Error finalizing: {e}")
            
            self.current_row_idx = None
            self.current_plate_in_row = None
        
        elif item.kloter == "AUTO":
            # Auto-recovery logic
            if self.current_row_idx is None or self.current_plate_in_row != item.plate:
                if item.loading > 0 or item.rehab > 0:
                    try:
                        row_idx = find_row_for_plate(ws, item.plate, date_str)
                        if row_idx:
                            self.current_row_idx = row_idx
                            self.current_plate_in_row = item.plate
                            logger.info(f"[Sheets] Recovered row {row_idx}")
                        else:
                            kloter = calculate_kloter(ws, item.plate, date_str)
                            row_data = [item.plate, date_str, timestamp_str, "", item.loading, item.rehab, kloter]
                            
                            col_a = ws.col_values(1)
                            next_row = len(col_a) + 1
                            if next_row < 2:
                                next_row = 2
                            
                            ws.update(f"A{next_row}:G{next_row}", [row_data])
                            self.current_row_idx = find_row_for_plate(ws, item.plate, date_str)
                            self.current_plate_in_row = item.plate
                            logger.info(f"[Sheets] Auto-created row for {item.plate}")
                    except Exception as e:
                        logger.error(f"[Sheets] Auto-creation failed: {e}")
            
            # Update counts
            if self.current_row_idx and self.current_plate_in_row == item.plate:
                try:
                    ws.update_cell(self.current_row_idx, 5, item.loading)
                    ws.update_cell(self.current_row_idx, 6, item.rehab)
                    logger.debug(f"[Sheets] Updated L:{item.loading} R:{item.rehab}")
                except Exception as e:
                    logger.error(f"[Sheets] Update failed: {e}")
                    self.current_row_idx = None
    
    def _process_supabase(self, item: DetectionPayload):
        """Process payload for Supabase."""
        if not self._supabase:
            return
        
        # Get session from manager if available
        session_id = None
        if self.session_manager:
            session = self.session_manager.current_session
            if session and session.session_id:
                session_id = session.session_id
        
        try:
            if item.kloter == "QR_START":
                # Log event to Supabase
                self._log_supabase_event(
                    session_id=session_id,
                    event_type="session_start",
                    description=f"QR scan started for {item.plate}",
                    event_data={"plate": item.plate, "source": "qr_scan"}
                )
                logger.info(f"[Supabase] Session start logged for {item.plate}")
            
            elif item.kloter == "SESSION_END":
                # Update final counts if we have session_id
                if session_id:
                    self._supabase.table('loading_sessions').update({
                        'loading_count': item.loading,
                        'rehab_count': item.rehab,
                        'items_in': item.loading,
                        'items_out': item.rehab,
                        'status': 'completed',
                        'counting_active': False,
                        'ended_at': datetime.datetime.utcnow().isoformat(),
                        'updated_at': datetime.datetime.utcnow().isoformat()
                    }).eq('id', session_id).execute()
                
                self._log_supabase_event(
                    session_id=session_id,
                    event_type="session_end",
                    description=f"Session ended: L={item.loading}, R={item.rehab}",
                    event_data={"loading": item.loading, "rehab": item.rehab}
                )
                logger.info(f"[Supabase] Session end logged: L={item.loading} R={item.rehab}")
            
            elif item.kloter == "AUTO":
                # Update counts in loading_sessions (Real-time sync for ALL fields)
                if session_id:
                    self._supabase.table('loading_sessions').update({
                        'loading_count': item.loading,
                        'rehab_count': item.rehab,
                        'items_in': item.loading,  # Sync for Dashboard
                        'items_out': item.rehab,   # Sync for Dashboard
                        'updated_at': datetime.datetime.utcnow().isoformat()
                    }).eq('id', session_id).execute()
                    logger.debug(f"[Supabase] Counts updated: L={item.loading} R={item.rehab}")
                
        except Exception as e:
            logger.error(f"[Supabase] Error processing {item.kloter}: {e}")
    
    def _log_supabase_event(
        self,
        session_id: Optional[str],
        event_type: str,
        description: str,
        event_data: Optional[Dict] = None
    ):
        """Log an event to Supabase loading_events table."""
        if not self._supabase:
            return
        
        try:
            import json
            self._supabase.table('loading_events').insert({
                'session_id': session_id,
                'event_type': event_type,
                'description': description,
                'event_data': json.dumps(event_data) if event_data else None,
                'source': 'cctv_engine',
                'event_ts': datetime.datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to log event: {e}")


# Alias for backward compatibility
UploaderThread = DualUploaderThread
