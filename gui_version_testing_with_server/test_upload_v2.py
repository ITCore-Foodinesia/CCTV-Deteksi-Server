import sys
import os
import time
from pathlib import Path
from oauth2client.service_account import ServiceAccountCredentials
import gspread
import datetime

# Setup paths
# Adjust this base path if running from a different location
APP_DIR = Path("d:/CCTV-Deteksi-Server/gui_version_testing_with_server")
CREDS_FILE = APP_DIR / "config" / "credentials.json"
SHEET_ID = "1Ry_7xYxnt9wto83G4MVLiclB7mticgxVcjxnXaZGIQM"
WORKSHEET_NAME = "FIX"

print(f"Using creds: {CREDS_FILE}")

def calculate_kloter(ws, plate, today_str):
    try:
        # Simple kloter logic for test
        return 1 
    except:
        return 1

try:
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name(str(CREDS_FILE), scope)
    gc = gspread.authorize(creds)
    
    print(f"Connecting to Sheet ID: {SHEET_ID}...")
    sh = gc.open_by_key(SHEET_ID)
    
    print(f"Opening Worksheet: {WORKSHEET_NAME}...")
    ws = sh.worksheet(WORKSHEET_NAME)
    
    # --- LOGIC DARI UPLOADER.PY ---
    print("\n--- TEST: Explicit A:G Range Write ---")
    
    item_plate = "TEST_ROW_ALIGNMENT"
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    timestamp_str = now.strftime("%H:%M:%S")
    kloter = 99
    
    # Columns: Plat, Tanggal, Jam Datang, Jam Selesai, Loading, Rehab, Kloter
    row_data = [item_plate, date_str, timestamp_str, "TEST_ONLY", 0, 0, kloter]
    
    print("1. Finding next empty row in Column A...")
    col_a = ws.col_values(1)
    next_row = len(col_a) + 1
    if next_row < 2: next_row = 2
    
    print(f"2. Target Row calculated: {next_row} (Length of Col A: {len(col_a)})")
    
    range_name = f"A{next_row}:G{next_row}"
    print(f"3. Writing to Range: {range_name}...")
    
    ws.update(range_name, [row_data])
    print(f"SUCCESS: Data written to {range_name}.")
    print(f"Please check row {next_row} in the Google Sheet.")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
