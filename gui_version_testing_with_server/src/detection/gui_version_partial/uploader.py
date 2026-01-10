import time
import threading
import queue
import datetime
import gspread
import requests
import traceback
from oauth2client.service_account import ServiceAccountCredentials

from .shared import DetectionPayload, ControlEvent, PROC_UPLOADER

# === GOOGLE SHEETS HELPERS ===
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
        print(f"[{PROC_UPLOADER}] Error opening worksheet: {e}")
        raise e

def find_row_for_plate(ws, plate, today_str):
    try:
        # Get all values is expensive, maybe optimize later?
        # For now, matching main_v2 logic
        rows = ws.get_all_values()
        if rows:
            # Start from row 2 (index 1) to skip header
            # enumerate start=1 means i will be 1-based index of the list item
            # But sheet rows are 1-based. 
            # Header is row 1. Data starts row 2.
            for i, row in enumerate(rows[1:], start=2):
                # row[0] = Plat, row[1] = Tanggal / Kabun (Check structure!)
                # Based on main_v2 append: [current_plate, today_str, now_str, "", 0, 0, kloter]
                # So row[0]=Plate, row[1]=Date
                if len(row) >= 4 and row[0] == plate and row[1] == today_str and not row[3]: # Row[3] is Time Out
                    return i
    except Exception as e:
        print(f"[{PROC_UPLOADER}] Error finding row: {e}")
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
        print(f"[{PROC_UPLOADER}] Error calc kloter: {e}")
        return 1

def send_telegram_message(message, token, chat_id):
    if not token or not chat_id:
        return
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        data = {"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}
        requests.post(url, data=data, timeout=5)
    except Exception as e:
        print(f"[{PROC_UPLOADER}] Telegram fail: {e}")

class UploaderThread(threading.Thread):
    def __init__(self, config, input_queue):
        super().__init__(daemon=True)
        self.config = config
        self.input_queue = input_queue
        self.running = True
        self.name = "UploaderThread"
        self.current_row_idx = None
        self.current_plate_in_row = None

    def run(self):
        print(f"[{PROC_UPLOADER}] Thread Started")
        
        # 1. Setup Connections
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds_file = self.config.creds
        
        gc = None
        ws = None
        
        # Retry connect
        while self.running:
            try:
                creds = ServiceAccountCredentials.from_json_keyfile_name(creds_file, scope)
                gc = gspread.authorize(creds)
                ws = get_worksheet_safe(gc, self.config.sheet_id, self.config.worksheet if self.config.worksheet else "FIX")
                print(f"[{PROC_UPLOADER}] Connected to Google Sheets: {self.config.worksheet}")
                break
            except Exception as e:
                print(f"[{PROC_UPLOADER}] Conn failed, retrying in 5s: {e}")
                time.sleep(5)
        
        # 2. Loop
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
                    self._process_payload(ws, item)
                    
                self.input_queue.task_done()
                
            except Exception as e:
                print(f"[{PROC_UPLOADER}] Error in loop: {e}")
                time.sleep(1)

    def _process_payload(self, ws, item):
        dt = datetime.datetime.fromtimestamp(item.timestamp)
        timestamp_str = dt.strftime("%H:%M:%S")
        
        # Operational Date Logic (Shift starts at 4 AM)
        # Transactions before 04:00 belong to Previous Day
        dt_shift = dt - datetime.timedelta(hours=4)
        date_str = dt_shift.strftime("%Y-%m-%d")
        
        # Telegram Notification Logic
        if item.kloter == "QR_START":
            msg = f"🔔 *SCAN BERHASIL*\nPlat: `{item.plate}`\nStatus: Siap Menghitung..."
            send_telegram_message(msg, self.config.notify_token, self.config.notify_chat_id)
            
            # Find or Create Row
            try:
                row_idx = find_row_for_plate(ws, item.plate, date_str)
                if row_idx is None:
                    # Create New
                    kloter = calculate_kloter(ws, item.plate, date_str)
                    # Columns: Plat, Tanggal, Jam Datang, Jam Selesai, Loading, Rehab, Kloter
                    row_data = [item.plate, date_str, timestamp_str, "", 0, 0, kloter]
                    ws.append_row(row_data)
                    print(f"[{PROC_UPLOADER}] New Row Created for {item.plate}")
                    
                    # Store current row
                    # Re-find to get ID or assume it's last? Safe to re-find or assume len+1?
                    # gspread append adds to bottom.
                    # Let's perform a lightweight find or just fetch all values.
                    # For safety, let's re-find.
                    self.current_row_idx = find_row_for_plate(ws, item.plate, date_str)
                else:
                    self.current_row_idx = row_idx
                    print(f"[{PROC_UPLOADER}] Using existing row {row_idx} for {item.plate}")
                
                self.current_plate_in_row = item.plate
            except Exception as e:
                print(f"[{PROC_UPLOADER}] Error handling QR_START: {e}")

        elif item.kloter == "SESSION_END":
            msg = f"✅ *SESI SELESAI*\nPlat: `{item.plate}`"
            send_telegram_message(msg, self.config.notify_token, self.config.notify_chat_id)
            
            # Finalize
            if self.current_row_idx and self.current_plate_in_row == item.plate:
                try:
                    # Col 4 = Jam Selesai, Col 5 = Loading, Col 6 = Rehab
                    ws.update_cell(self.current_row_idx, 4, timestamp_str)
                    ws.update_cell(self.current_row_idx, 5, item.loading)
                    ws.update_cell(self.current_row_idx, 6, item.rehab)
                    print(f"[{PROC_UPLOADER}] Finalized Row {self.current_row_idx}")
                except Exception as e:
                    print(f"[{PROC_UPLOADER}] Error finalizing: {e}")
            
            self.current_row_idx = None
            self.current_plate_in_row = None

        elif item.kloter == "AUTO":
             # AUTO event comes with current loading/rehab counts
             
             # 1. Recovery/Auto-Create Logic
             if self.current_row_idx is None or self.current_plate_in_row != item.plate:
                 if item.loading > 0 or item.rehab > 0:
                     try:
                         print(f"[{PROC_UPLOADER}] Detection with no active row. Finding/Creating for {item.plate}...")
                         row_idx = find_row_for_plate(ws, item.plate, date_str)
                         if row_idx:
                             self.current_row_idx = row_idx
                             self.current_plate_in_row = item.plate
                             print(f"[{PROC_UPLOADER}] Recovered existing row {row_idx}")
                         else:
                             # Create NEW row for the detection
                             kloter = calculate_kloter(ws, item.plate, date_str)
                             row_data = [item.plate, date_str, timestamp_str, "", item.loading, item.rehab, kloter]
                             ws.append_row(row_data)
                             self.current_row_idx = find_row_for_plate(ws, item.plate, date_str)
                             self.current_plate_in_row = item.plate
                             print(f"[{PROC_UPLOADER}] Created Auto-Row for {item.plate} (Kloter {kloter})")
                     except Exception as e:
                         print(f"[{PROC_UPLOADER}] Auto-creation failed: {e}")
             
             # 2. Actual Update
             if self.current_row_idx and self.current_plate_in_row == item.plate:
                 try:
                    # Update counts (Col 5 = Loading, Col 6 = Rehab)
                    ws.update_cell(self.current_row_idx, 5, item.loading)
                    ws.update_cell(self.current_row_idx, 6, item.rehab)
                    print(f"[{PROC_UPLOADER}] Updated counts Row {self.current_row_idx}: L:{item.loading} R:{item.rehab}")
                 except Exception as e:
                     print(f"[{PROC_UPLOADER}] Update failed: {e}")
                     self.current_row_idx = None # Trigger recovery next loop

