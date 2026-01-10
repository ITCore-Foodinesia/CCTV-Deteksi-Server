import os
import asyncio
import logging
import signal
import subprocess
import sys
import requests
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict

import uvicorn
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, User
from telegram.ext import (
    ApplicationBuilder,
    ContextTypes,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
)

# --- CONFIGURATION ---
load_dotenv()
# Gunakan token langsung jika env bermasalah
BOT_TOKEN = os.getenv("BOT_TOKEN", "8381954758:AAG8_0nhOX_6tND-Sk57zylJOsGqnVaaDvQ")
DEFAULT_CHAT_ID = "7678774830"
API_SERVER_URL = "http://localhost:5001/api/telegram_update"

# Configurations for the external process
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
# MAIN_V2_PATH = os.path.join(BASE_DIR, "main_v2.py")
# The modular version is a package, we run it with -m
MAIN_V2_DIR = BASE_DIR / "src" / "detection" / "gui_version_partial"
CREDENTIALS_PATH = BASE_DIR / "credentials.json"
MODEL_PATH = BASE_DIR / "models" / "bestbaru.engine"

# List of allowed plates
ALLOWED_PLATES = [
    "KT 8899 TEST",
    "KT 5127 UKL",
    "KT 8550 UQ RAFIF",
    "KT 1234 ABC",
    "KT 5678 DEF"
]

# --- LOGGING ---
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# --- GLOBAL STATE ---
class SystemState:
    def __init__(self):
        self.plate: Optional[str] = None
        self.status: str = "IDLE"  # IDLE, READY, LOADING, STOPPED
        self.operator: str = "-"
        self.process: Optional[subprocess.Popen] = None
        self.start_time: Optional[str] = None

state = SystemState()
active_chat_id = None # Store last active chat ID
active_message_id = None # Store last active message ID to avoid spam

# --- HELPER: SEND UPDATE TO API SERVER ---
def send_api_update(plate: str, status: str):
    """
    Kirim update status ke API Server (localhost:5001) 
    agar TUI dan Dashboard lain ikut berubah.
    """
    try:
        payload = {
            "plate": plate if plate else "UNKNOWN",
            "status": status,
            "source": "telegram_bot"
        }
        # Gunakan timeout pendek agar tidak nge-block bot jika API mati
        response = requests.post(API_SERVER_URL, json=payload, timeout=2)
        if response.status_code == 200:
            logger.info(f"✅ API Update Sent: {payload}")
        else:
            logger.warning(f"⚠️ API Update Failed: {response.status_code} - {response.text}")
    except requests.exceptions.RequestException as e:
        logger.warning(f"⚠️ Could not connect to API Server: {e}")

# --- SUBPROCESS MANAGEMENT (DISABLED FOR V4 INTEGRATION) ---
def start_main_process(plate: str):
    """
    Simulates starting the process by just updating the state.
    The actual V4 process (detector.py) should be running separately and polling API.
    """
    logger.info(f"Command received: START for {plate}")
    
    # Just return success, the update is handled by the calling function (callback_handler) 
    # sending the API request.
    return True, "Success (Command Sent)"

def stop_main_process():
    """Simulates stopping the process."""
    logger.info("Command received: STOP")
    return True, "Stopped (Command Sent)"

# --- TELEGRAM BOT LOGIC ---

async def cmd_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Shows the menu to select a plate."""
    global active_chat_id
    active_chat_id = update.effective_chat.id
    
    keyboard = []
    # Create buttons for each allowed plate
    # Layout: 2 buttons per row
    row = []
    for plate in ALLOWED_PLATES:
        row.append(InlineKeyboardButton(f"🚛 {plate}", callback_data=f"select_{plate}"))
        if len(row) == 2:
            keyboard.append(row)
            row = []
    if row:
        keyboard.append(row)
        
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "📋 *PILIH PLAT KENDARAAN*\n\nSilakan pilih plat nomor dari daftar di bawah ini untuk memulai loading:",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def cmd_ignore_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ignores all text messages to enforce button usage."""
    return

def get_dashboard_text():
    icon_status = "⚪"
    if state.status == "LOADING": icon_status = "🟢"
    elif state.status == "STOPPED": icon_status = "🔴"
    elif state.status == "FINISHED": icon_status = "🏁"
    elif state.status == "READY": icon_status = "🟡"

    return (
        f"📊 *DASHBOARD CONTROL*\n\n"
        f"🚛 *Plat:* `{state.plate if state.plate else 'Belum Dipilih'}`\n"
        f"👷 *Operator:* {state.operator}\n"
        f"🔄 *Status:* {icon_status} *{state.status}*"
    )

def get_control_keyboard():
    """Returns the keyboard for Start/Stop control."""
    if state.status == "LOADING":
        return InlineKeyboardMarkup([
            [InlineKeyboardButton("⏹️ STOP LOADING", callback_data="action_stop")]
        ])
    else:
        # Ready or Stopped, allow Start if plate is set
        return InlineKeyboardMarkup([
            [InlineKeyboardButton("▶️ START LOADING", callback_data="action_start")],
            [InlineKeyboardButton("🔙 Ganti Plat", callback_data="action_reset")]
        ])

async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global active_chat_id, active_message_id
    query = update.callback_query
    active_chat_id = query.message.chat_id
    active_message_id = query.message.message_id
    
    await query.answer()
    
    data = query.data
    user = query.from_user
    operator_name = user.first_name

    logger.info(f"Interaction: {data} by {operator_name}")

    if data.startswith("select_"):
        # Plate Selected
        selected_plate = data.replace("select_", "")
        state.plate = selected_plate
        state.status = "READY"
        state.operator = operator_name
        
        # Sync API
        send_api_update(state.plate, "READY")
        
        await query.edit_message_text(
            text=get_dashboard_text(),
            reply_markup=get_control_keyboard(),
            parse_mode='Markdown'
        )
        
    elif data == "action_start":
        # Start Loading
        if not state.plate:
            await query.answer("⚠️ Pilih plat dulu!", show_alert=True)
            return

        state.operator = operator_name
        success, msg = start_main_process(state.plate)
        
        if success:
            state.status = "LOADING"
            state.start_time = datetime.now().strftime("%H:%M:%S")
            
            # Sync API
            send_api_update(state.plate, "START")
            
            await query.edit_message_text(
                text=get_dashboard_text() + f"\n\n🚀 *Started at {state.start_time}*",
                reply_markup=get_control_keyboard(),
                parse_mode='Markdown'
            )
            try:
                await query.message.pin()
            except:
                pass 
        else:
            await query.answer(f"❌ Gagal Start: {msg}", show_alert=True)

    elif data == "action_stop":
        # Stop Loading
        state.operator = operator_name
        success, msg = stop_main_process()
        
        if success:
            state.status = "FINISHED"
            
            # Sync API
            send_api_update(state.plate, "FINISHED")
            
            # 1. FINALIZE OLD MESSAGE (HISTORY)
            stop_time = datetime.now().strftime('%H:%M:%S')
            final_text = get_dashboard_text() + f"\n\n🛑 *Stopped at {stop_time}*\n(Session Ended)"
            
            try:
                await query.edit_message_text(
                    text=final_text,
                    reply_markup=None, # Remove buttons from history
                    parse_mode='Markdown'
                )
                await query.message.unpin()
            except Exception as e:
                logger.warning(f"Failed to finalize message: {e}")
                
            # 2. SEND NEW MENU MESSAGE
            keyboard = [[InlineKeyboardButton("🔄 Mulai Lagi", callback_data="action_restart")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            new_msg = await context.bot.send_message(
                chat_id=active_chat_id,
                text="✅ Sesi Berakhir. Klik tombol di bawah untuk memulai sesi baru.",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            # Update active message ID so next interactions use this new message
            active_message_id = new_msg.message_id
        else:
            await query.answer(f"❌ Gagal Stop: {msg}", show_alert=True)

    elif data == "action_restart":
        # Show Plate List
        state.plate = None
        state.status = "IDLE"
        
        keyboard = []
        row = []
        for plate in ALLOWED_PLATES:
            row.append(InlineKeyboardButton(f"🚛 {plate}", callback_data=f"select_{plate}"))
            if len(row) == 2:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        try:
            await query.edit_message_text(
                "📋 *PILIH PLAT KENDARAAN*\n\nSilakan pilih plat nomor dari daftar di bawah ini:",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
        except Exception as e:
                logger.warning(f"Failed to edit message: {e}")
            
    elif data == "action_reset":
        # Back to Menu
        state.plate = None
        state.status = "IDLE"
        state.operator = "-"
        
        # Sync API (Reset)
        send_api_update("", "WAITING")
        
        keyboard = []
        row = []
        for plate in ALLOWED_PLATES:
            row.append(InlineKeyboardButton(f"🚛 {plate}", callback_data=f"select_{plate}"))
            if len(row) == 2:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        try:
            await query.edit_message_text(
                "📋 *PILIH PLAT KENDARAAN*\n\nSilakan pilih plat nomor dari daftar di bawah ini:",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
        except Exception as e:
            if "Message is not modified" in str(e):
                pass
            else:
                logger.warning(f"Failed to edit message: {e}")

# --- HTML CONTENT ---
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading Operation Dashboard</title>
    <style>
        :root {
            --bg-color: #121212;
            --card-bg: #1e1e1e;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --accent-green: #00e676;
            --accent-red: #ff5252;
            --accent-yellow: #ffea00;
            --accent-blue: #2979ff;
        }
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }
        .dashboard-container {
            background-color: var(--card-bg);
            border-radius: 20px;
            padding: 40px;
            width: 90%;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            border: 1px solid #333;
        }
        .header {
            font-size: 1.2rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 40px;
        }
        .plate-display {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 10px;
            color: #fff;
            text-shadow: 0 0 20px rgba(255,255,255,0.1);
        }
        .operator-display {
            font-size: 1.2rem;
            color: var(--accent-blue);
            margin-bottom: 40px;
            font-weight: 500;
        }
        .status-badge {
            display: inline-block;
            padding: 15px 40px;
            border-radius: 50px;
            font-size: 2rem;
            font-weight: bold;
            text-transform: uppercase;
            transition: all 0.3s ease;
        }
        
        .status-idle { background-color: #333; color: #777; }
        .status-ready { background-color: rgba(255, 234, 0, 0.1); color: var(--accent-yellow); border: 2px solid var(--accent-yellow); }
        .status-loading { 
            background-color: rgba(0, 230, 118, 0.1); 
            color: var(--accent-green); 
            border: 2px solid var(--accent-green);
            box-shadow: 0 0 30px rgba(0, 230, 118, 0.2);
            animation: pulse 2s infinite;
        }
        .status-stopped { background-color: rgba(255, 82, 82, 0.1); color: var(--accent-red); border: 2px solid var(--accent-red); }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="header">Loading Station Status</div>
        
        <div id="plate" class="plate-display">---</div>
        <div id="operator" class="operator-display">Waiting for Operator...</div>
        
        <div id="status" class="status-badge status-idle">IDLE</div>
    </div>

    <script>
        async function updateDashboard() {
            try {
                const response = await fetch('/api/state');
                const data = await response.json();
                
                const plateEl = document.getElementById('plate');
                const operatorEl = document.getElementById('operator');
                const statusEl = document.getElementById('status');
                
                plateEl.textContent = data.plate ? data.plate : "---";
                operatorEl.textContent = data.operator !== "-" ? "👷 " + data.operator : "Waiting for Operator...";
                statusEl.textContent = data.status;
                
                statusEl.className = 'status-badge';
                if (data.status === 'LOADING') statusEl.classList.add('status-loading');
                else if (data.status === 'STOPPED') statusEl.classList.add('status-stopped');
                else if (data.status === 'READY') statusEl.classList.add('status-ready');
                else statusEl.classList.add('status-idle');
                
            } catch (error) {
                console.error("Error fetching state:", error);
            }
        }
        
        setInterval(updateDashboard, 1000);
        updateDashboard();
    </script>
</body>
</html>
"""

# --- FASTAPI APP ---
app = FastAPI()
ptb = ApplicationBuilder().token(BOT_TOKEN or "DUMMY").build()

@asynccontextmanager
async def lifespan(app: FastAPI):
    if BOT_TOKEN:
        logger.info("Initializing Telegram Bot...")
        ptb.add_handler(CommandHandler("start", cmd_menu))
        ptb.add_handler(CommandHandler("menu", cmd_menu))
        ptb.add_handler(CallbackQueryHandler(callback_handler))
        ptb.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), cmd_ignore_text))
        
        await ptb.initialize()
        await ptb.start()
        await ptb.updater.start_polling()
        logger.info("Telegram Bot Started!")
    else:
        logger.warning("No BOT_TOKEN provided.")
        
    yield
    
    if BOT_TOKEN:
        await ptb.updater.stop()
        await ptb.stop()
        await ptb.shutdown()
        logger.info("Telegram Bot Stopped.")
    
    stop_main_process()

app = FastAPI(lifespan=lifespan)

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    return HTMLResponse(content=HTML_TEMPLATE)

@app.get("/api/state")
async def get_api_state():
    return JSONResponse({
        "plate": state.plate,
        "status": state.status,
        "operator": state.operator,
        "active": state.process is not None
    })

@app.post("/bot/reset")
async def bot_reset_timeout():
    """External trigger to reset bot state (e.g. on 10 min timeout)"""
    global active_chat_id, active_message_id
    if not active_chat_id:
        return JSONResponse({"status": "error", "message": "No active chat ID found"}, status_code=400)
    
    try:

        # 1. Update Internal State to FINISHED for History
        state.status = "FINISHED"
        
        # 2. FINALIZE OLD MESSAGE (History update)
        if active_message_id:
            try:
                stop_time = datetime.now().strftime('%H:%M:%S')
                final_text = get_dashboard_text() + f"\n\n⏰ *Timeout at {stop_time}*\n(Session Ended Automatically)"
                
                await ptb.bot.edit_message_text(
                    chat_id=active_chat_id,
                    message_id=active_message_id,
                    text=final_text,
                    reply_markup=None,
                    parse_mode="Markdown"
                )
                await ptb.bot.unpin_chat_message(chat_id=active_chat_id, message_id=active_message_id)
            except Exception as e:
                logger.warning(f"Could not finalize timeout message: {e}")
        
        # 3. Reset State for New Session
        state.status = "IDLE"
        state.plate = None

        # 4. SEND NEW MESSAGE (Restart Button Only)
        keyboard = [[InlineKeyboardButton("🔄 Mulai Lagi", callback_data="action_restart")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        msg_text = "⚠️ *SESSION TIMEOUT*\n\nWaktu 10 menit habis tanpa aktivitas."
        
        # 2. SEND NEW MESSAGE
        sent_msg = await ptb.bot.send_message(
            chat_id=active_chat_id, 
            text=msg_text,
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )
        active_message_id = sent_msg.message_id
        logger.info(f"New timeout message sent to {active_chat_id}")
            
        return {"status": "success", "message": "Reset notification sent"}
    except Exception as e:
        logger.error(f"Failed to reset bot: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

if __name__ == "__main__":
    if not BOT_TOKEN:
        print("WARNING: No BOT_TOKEN set.")
    uvicorn.run("telegram_loading_dashboard:app", host="0.0.0.0", port=8000, reload=True)
