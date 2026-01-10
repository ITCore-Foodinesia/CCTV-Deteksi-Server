import os
import sys
import subprocess
import threading
import time
import json
import datetime
from pathlib import Path

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog

try:
    import psutil
except ImportError:
    psutil = None


# Get project root (2 levels up from src/gui/)
APP_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = APP_DIR / "config" / "control_panel_config.json"


def load_config() -> dict:
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_config(cfg: dict) -> None:
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def is_process_running(script_name: str) -> bool:
    if psutil is None:
        return False
    for proc in psutil.process_iter(attrs=["pid", "name", "cmdline"]):
        try:
            cmd = proc.info.get("cmdline") or []
            if not cmd:
                continue
            # Cari eksekusi python yang memanggil script_name
            for arg in cmd:
                if isinstance(arg, str) and script_name.lower() in arg.lower():
                    return True
        except Exception:
            continue
    return False


def kill_process(script_name: str) -> int:
    if psutil is None:
        return 0
    killed = 0
    for proc in psutil.process_iter(attrs=["pid", "name", "cmdline"]):
        try:
            cmd = proc.info.get("cmdline") or []
            if not cmd:
                continue
            if any(isinstance(arg, str) and script_name.lower() in arg.lower() for arg in cmd):
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except Exception:
                    proc.kill()
                killed += 1
        except Exception:
            continue
    return killed


class ControlPanel(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Icetube Control Panel")
        self.geometry("820x650")
        self.resizable(False, False)

        # Paths to project files
        self.icetube_main_path = str((APP_DIR / "archive" / "icetube_main.py").resolve())
        self.main_v2_path = str((APP_DIR / "archive" / "main_v2_legacy.py").resolve())  # V2 archived
        self.qr_standby_path = str((APP_DIR / "qr_standby.py").resolve())
        self.bot_monitor_path = str((APP_DIR / "src" / "integrations" / "telegram" / "telegram_monitor_bot.py").resolve())

        # Konfigurasi global (akun + profil)
        self.config_data = load_config()
        if "accounts" not in self.config_data:
            self.config_data["accounts"] = []  # [{username, password}]
        if "profiles" not in self.config_data:
            self.config_data["profiles"] = {}  # name -> args dict
        if "last_profile" not in self.config_data:
            self.config_data["last_profile"] = ""
        
        # Default detection settings
        # Default detection settings
        self.detection_conf = self.config_data.get("last_conf", "0.25")
        self.detection_iou = self.config_data.get("last_iou", "0.35")
        
        # Auto start setting
        self.auto_start_enabled = self.config_data.get("auto_start", False)
        
        # V4 Persistence Logic setting
        self.v4_enabled = self.config_data.get("v4_enabled", False)

        # Fallback to V2 setting (default OFF) - renamed to auto_restart_v3
        self.auto_restart_enabled = self.config_data.get("auto_restart_v3", False)

        # Login terlebih dahulu
        if not self._login_flow():
            self.destroy()
            return

        # current_username sudah di-set di _login_dialog() setelah login berhasil

        self._build_ui()
        self._start_status_loop()

        # Auto start Main V3 + Bot jika enabled
        if self.auto_start_enabled:
            self.after(1000, self._auto_start_services)  # Delay 1 detik setelah UI siap

    def _build_ui(self) -> None:
        pad = {"padx": 8, "pady": 6}

        # Status frame
        status_frame = ttk.LabelFrame(self, text="Status")
        status_frame.pack(fill=tk.X, **pad)
        # Warna sesuai theme
        bgcol = self.cget('bg') if hasattr(self,'cget') else '#f0f0f0'
        self.status_text = tk.Text(status_frame, height=1, font=("Segoe UI", 14, "bold"), borderwidth=0, bg=bgcol, relief='flat')
        self.status_text.pack(fill=tk.X, padx=10, pady=14)
        self.status_text.config(state=tk.DISABLED)

        # Config frame
        # Profil CCTV
        profile_frame = ttk.LabelFrame(self, text="Profil CCTV")
        profile_frame.pack(fill=tk.X, **pad)

        ttk.Label(profile_frame, text="Pilih Profil:").grid(row=0, column=0, sticky=tk.W, padx=8, pady=4)
        self.profile_var = tk.StringVar(value=self.config_data.get("last_profile", ""))
        self.profile_combo = ttk.Combobox(profile_frame, textvariable=self.profile_var, values=sorted(list(self.config_data.get("profiles", {}).keys())), width=50, state="readonly")
        self.profile_combo.grid(row=0, column=1, sticky=tk.W, padx=8, pady=4)
        ttk.Button(profile_frame, text="Muat", command=self.load_profile).grid(row=0, column=2, padx=6)
        ttk.Button(profile_frame, text="Hapus", command=self.delete_profile).grid(row=0, column=3, padx=6)
        for i in range(4):
            profile_frame.columnconfigure(i, weight=0)

        # Buat entry fields secara internal (tidak ditampilkan di UI)
        # Frame tersembunyi untuk menyimpan entry fields
        hidden_frame = ttk.Frame(self)
        # Jangan pack frame ini, biarkan tersembunyi
        
        self.entry_source = self._create_hidden_entry(hidden_frame, default="", placeholder="rtsp://username:password@ip:port/path")
        self.entry_model = self._create_hidden_entry(hidden_frame, default=str((APP_DIR / "models" / "bestbaru.engine").resolve()))
        self.entry_creds = self._create_hidden_entry(hidden_frame, default=str((APP_DIR / "credentials.json").resolve()))
        self.entry_sheet = self._create_hidden_entry(hidden_frame, default="", placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
        self.entry_ws = self._create_hidden_entry(hidden_frame, default="AUTO_ID")
        self.entry_plate = self._create_hidden_entry(hidden_frame, default="UNKNOWN")
        self.entry_system_token = self._create_hidden_entry(hidden_frame, default="", placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
        self.entry_system_chat = self._create_hidden_entry(hidden_frame, default="", placeholder="-1001234567890")
        self.entry_notify_token = self._create_hidden_entry(hidden_frame, default="", placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
        self.entry_notify_chat = self._create_hidden_entry(hidden_frame, default="", placeholder="-1001234567890")

        # Buttons frame
        btns = ttk.LabelFrame(self, text="Kontrol")
        btns.pack(fill=tk.X, **pad)

        # Urutan: BOT | QR | MAIN | MAIN V2 | LOG
        # Urutan: BOT | MAIN V2 | MAIN V3 | LOG | SETTINGS
        self.btn_bot = tk.Button(btns, text="Bot Monitor", command=self.toggle_bot)
        self.btn_bot.grid(row=0, column=0, padx=8, pady=8, sticky=tk.W+tk.E)
        
        self.btn_main_v3 = tk.Button(btns, text="Main V3 (Modular)", command=self.toggle_main_v3, bg="#FFD700")
        self.btn_main_v3.grid(row=0, column=2, padx=8, pady=8, sticky=tk.W+tk.E)

        self.btn_v4 = tk.Button(btns, text="V4 Mode", command=self.toggle_v4_state)
        self.btn_v4.grid(row=0, column=3, padx=8, pady=8, sticky=tk.W+tk.E)
        self._update_v4_button_style()

        # Auto Start V3 toggle button (for bot auto-restart)
        self.btn_autostart = tk.Button(btns, text="Auto Start", command=self.toggle_autostart_state)
        self.btn_autostart.grid(row=0, column=4, padx=8, pady=8, sticky=tk.W+tk.E)
        self._update_autostart_button_style()

        ttk.Button(btns, text="Buka Log", command=self.open_log).grid(row=0, column=5, padx=8, pady=8, sticky=tk.W)
        
        # Tombol Advanced Settings
        self.btn_advanced = tk.Button(
            btns, 
            text="Advanced Settings", 
            command=self.open_advanced_settings,
            font=("Segoe UI", 10, "bold"),
            bg="#4CAF50",  # Green background
            fg="white",
            activebackground="#45a049",
            activeforeground="white",
            width=15,
            relief=tk.RAISED,
            borderwidth=2
        )

        self.btn_advanced.grid(row=0, column=6, padx=8, pady=8, sticky=tk.W)

        for i in range(8):
            btns.columnconfigure(i, weight=1)

        # Log frame (ringkas, hanya info)
        logf = ttk.LabelFrame(self, text="Info")
        logf.pack(fill=tk.BOTH, expand=True, **pad)
        self.info_text = tk.Text(logf, height=14, wrap=tk.WORD)
        self.info_text.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Muat profil awal jika ada
        if self.profile_var.get():
            self.load_profile()

    def _add_labeled_entry(self, parent: ttk.LabelFrame, label: str, row: int, default: str = "", placeholder: str = "") -> tk.Entry:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky=tk.W, padx=8, pady=4)
        ent = ttk.Entry(parent, width=92)
        ent.grid(row=row, column=1, sticky=tk.W, padx=8, pady=4)
        
        # Tambahkan placeholder jika ada
        if placeholder and not default:
            ent.insert(0, placeholder)
            ent.configure(foreground="gray")
            
            def on_focus_in(event):
                if ent.get() == placeholder:
                    ent.delete(0, tk.END)
                    ent.configure(foreground="black")
            
            def on_focus_out(event):
                if not ent.get():
                    ent.insert(0, placeholder)
                    ent.configure(foreground="gray")
            
            ent.bind("<FocusIn>", on_focus_in)
            ent.bind("<FocusOut>", on_focus_out)
        elif default:
            ent.insert(0, default)
        return ent
    
    def _create_hidden_entry(self, parent: ttk.Frame, default: str = "", placeholder: str = "") -> tk.Entry:
        """Membuat entry field tersembunyi untuk menyimpan data"""
        ent = tk.Entry(parent, width=1)  # Width minimal karena tidak ditampilkan
        
        # Tambahkan placeholder jika ada
        if placeholder and not default:
            ent.insert(0, placeholder)
            ent.configure(foreground="gray")
        elif default:
            ent.insert(0, default)
        return ent

    def log(self, text: str) -> None:
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        if hasattr(self, 'info_text'):
            self.info_text.insert(tk.END, f"[{ts}] {text}\n")
            self.info_text.see(tk.END)
        else:
            print(f"[{ts}] {text}")  # Fallback ke console jika GUI belum siap

    def _status_tick(self) -> None:
        # Status bar coloring
        bot = is_process_running("telegram_monitor_bot.py")
        qr = is_process_running("qr_standby.py")
        # Main V3
        main_v3 = is_process_running("src.detection.gui_version_partial.main") or is_process_running("gui_version_partial.main") or is_process_running("main.py")

        status_top = f"Bot: {'ON' if bot else 'OFF'}  |  QR: {'ON' if qr else 'OFF'}  |  Main V3: {'ON' if main_v3 else 'OFF'}"
        self.status_text.config(state=tk.NORMAL)
        self.status_text.delete("1.0", tk.END)
        self.status_text.insert(tk.END, status_top)
        
        for label, state in [("Bot", bot), ("QR", qr), ("Main V3", main_v3)]:
            search_word = 'ON' if state else 'OFF'
            color = '#2ecc40' if state else '#ff3b30'
            labelspan = f"{label}: {search_word}"
            start = status_top.find(labelspan)
            if start >= 0:
                word_start = start + len(label)+2
                widx = f"1.{word_start}"
                widx_end = f"1.{word_start+len(search_word)}"
                self.status_text.tag_add(f"col{label}", widx, widx_end)
                self.status_text.tag_config(f"col{label}", foreground=color)
        self.status_text.config(state=tk.DISABLED)

        def color(btn, active, oncol, offcol, label):
            btn.configure(
                background=(oncol if active else offcol),
                activebackground=(oncol if active else offcol),
                foreground='white', activeforeground='white',
                font=("Segoe UI", 10, "bold"),
                text=f"{label} ({'ON' if active else 'OFF'})"
            )
        # Bot Monitor: ON biru, OFF oranye muda
        # Bot Monitor: ON biru, OFF oranye muda
        color(self.btn_bot, bot, '#2176FF', '#FFB300', 'Bot Monitor')
        
        # Main V3
        color(self.btn_main_v3, main_v3, '#2ecc40', '#FFD700', 'Main V3 (Modular)')
        
        self.after(1500, self._status_tick)

    def _start_status_loop(self) -> None:
        self.after(200, self._status_tick)

    def toggle_v4_state(self) -> None:
        self.v4_enabled = not self.v4_enabled
        self.config_data["v4_enabled"] = self.v4_enabled
        save_config(self.config_data)
        self._update_v4_button_style()
        self.log(f"V4 Mode {'ENABLED' if self.v4_enabled else 'DISABLED'}")

    def _update_v4_button_style(self) -> None:
        oncol = '#9B51E0' # Purple for V4
        offcol = '#E0E0E0'
        active = self.v4_enabled
        self.btn_v4.configure(
            background=(oncol if active else offcol),
            activebackground=(oncol if active else offcol),
            foreground=('white' if active else 'black'),
            activeforeground=('white' if active else 'black'),
            font=("Segoe UI", 10, "bold"),
            text=f"V4 Persistence ({'ON' if active else 'OFF'})"
        )

    def toggle_autostart_state(self) -> None:
        self.auto_restart_enabled = not self.auto_restart_enabled
        self.config_data["auto_restart_v3"] = self.auto_restart_enabled
        save_config(self.config_data)
        self._update_autostart_button_style()
        self.log(f"Auto Start V3 {'ENABLED' if self.auto_restart_enabled else 'DISABLED'}")

    def _update_autostart_button_style(self) -> None:
        oncol = '#4CAF50'  # Green for auto start enabled
        offcol = '#E0E0E0'
        active = self.auto_restart_enabled
        self.btn_autostart.configure(
            background=(oncol if active else offcol),
            activebackground=(oncol if active else offcol),
            foreground=('white' if active else 'black'),
            activeforeground=('white' if active else 'black'),
            font=("Segoe UI", 10, "bold"),
            text=f"Auto Start ({'ON' if active else 'OFF'})"
        )

    def _python_exe(self) -> str:
        return sys.executable or "python"

    def start_qr(self) -> None:
        try:
            if is_process_running("qr_standby.py"):
                self.log("QR Standby sudah berjalan.")
                return
            cmd = [
                self._python_exe(),
                str(Path(self.qr_standby_path)),
                "--source", self.entry_source.get().strip(),
                "--source-type", "rtsp",
                "--model", self.entry_model.get().strip(),
                "--creds", self.entry_creds.get().strip(),
                "--sheet_id", self.entry_sheet.get().strip(),
                "--worksheet", self.entry_ws.get().strip(),
                "--notify_token", self.entry_notify_token.get().strip(),
                "--notify_chat_id", self.entry_notify_chat.get().strip(),
                "--system_token", self.entry_system_token.get().strip(),
                "--system_chat_id", self.entry_system_chat.get().strip(),
            ]
            subprocess.Popen(
                cmd,
                cwd=str(APP_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=(subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0),
            )
            self.log("Menjalankan QR Standby...")
        except Exception as e:
            messagebox.showerror("Gagal menjalankan QR", str(e))

    def stop_qr(self) -> None:
        n = kill_process("qr_standby.py")
        self.log(f"QR Standby dihentikan (terminated={n}).")

    def toggle_qr(self) -> None:
        if is_process_running("qr_standby.py"):
            self.stop_qr()
        else:
            self.start_qr()

    def start_main(self) -> None:
        try:
            if is_process_running("icetube_main.py"):
                self.log("Main detector sudah berjalan.")
                return
            cmd = [
                self._python_exe(),
                str(Path(self.icetube_main_path)),
                "--source", self.entry_source.get().strip(),
                "--model", self.entry_model.get().strip(),
                "--creds", self.entry_creds.get().strip(),
                "--sheet_id", self.entry_sheet.get().strip(),
                "--worksheet", self.entry_ws.get().strip(),
                "--plate", self.entry_plate.get().strip(),
                "--notify_token", self.entry_notify_token.get().strip(),
                "--notify_chat_id", self.entry_notify_chat.get().strip(),
            ]
            subprocess.Popen(
                cmd,
                cwd=str(APP_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=(subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0),
            )
            self.log("Menjalankan Main Detector...")
        except Exception as e:
            messagebox.showerror("Gagal menjalankan Main", str(e))

    def stop_main(self) -> None:
        n = kill_process("icetube_main.py")
        self.log(f"Main detector dihentikan (terminated={n}).")

    def toggle_main(self) -> None:
        if is_process_running("icetube_main.py"):
            self.stop_main()
        else:
            self.start_main()

    def start_main_v2(self) -> None:
        try:
            if is_process_running("main_v2.py"):
                self.log("Main V2 sudah berjalan.")
                return
            
            # Check if Integrated Server is running (and warn/prevent?)
            # if is_process_running("integrated_main.py"):
            #      if not messagebox.askyesno("Konflik", "Integrated Server (API) sedang berjalan. Menjalankan Main V2 mungkin akan konflik kamera.\nLanjutkan?"):
            #          return

            if is_process_running("qr_standby.py"):
                self.log("Menghentikan QR Standby sebelum menjalankan Main V2...")
                self.stop_qr()
                time.sleep(1)

            # Otomatis start bot monitor jika belum berjalan
            if not is_process_running("telegram_monitor_bot.py"):
                self.log("Otomatis start Bot Monitor untuk Main V2...")
                self.start_bot(auto_start_qr=False)
                time.sleep(2)  # Tunggu bot start
            
            # Validasi dan ambil nilai dari entry fields
            def get_value(entry, placeholder=""):
                val = entry.get().strip()
                # Jika kosong atau sama dengan placeholder, return empty string
                if not val or val == placeholder:
                    return ""
                return val
            
            # Ambil nilai dari semua field
            source = get_value(self.entry_source, "rtsp://username:password@ip:port/path")
            model = self.entry_model.get().strip()
            creds = self.entry_creds.get().strip()
            sheet_id = get_value(self.entry_sheet, "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
            worksheet = self.entry_ws.get().strip()
            plate = self.entry_plate.get().strip()
            notify_token = get_value(self.entry_notify_token, "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
            notify_chat = get_value(self.entry_notify_chat, "-1001234567890")
            system_token = get_value(self.entry_system_token, "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
            system_chat = get_value(self.entry_system_chat, "-1001234567890")
            
            # Debug: log semua nilai yang diambil
            self.log(f"Debug - source: {source[:50] if source else 'EMPTY'}...")
            self.log(f"Debug - model: {model[:50] if model else 'EMPTY'}...")
            self.log(f"Debug - creds: {creds[:50] if creds else 'EMPTY'}...")
            self.log(f"Debug - sheet_id: {sheet_id[:30] if sheet_id else 'EMPTY'}...")
            self.log(f"Debug - worksheet: {worksheet if worksheet else 'EMPTY'}")
            self.log(f"Debug - plate: {plate if plate else 'EMPTY'}")
            self.log(f"Debug - notify_token: {notify_token[:20] if notify_token else 'EMPTY'}...")
            self.log(f"Debug - notify_chat: {notify_chat if notify_chat else 'EMPTY'}")
            
            # Validasi required fields
            required_fields = {
                "source": source,
                "model": model,
                "creds": creds,
                "sheet_id": sheet_id,
                "worksheet": worksheet,
                "plate": plate,
                "notify_token": notify_token,
                "notify_chat_id": notify_chat
            }
            
            missing_fields = [k for k, v in required_fields.items() if not v]
            if missing_fields:
                error_msg = f"Field berikut harus diisi:\n{', '.join(missing_fields)}\n\n"
                error_msg += "Silakan isi semua field yang diperlukan atau muat profil yang sudah tersimpan."
                messagebox.showerror("Field Kosong", error_msg)
                self.log(f"ERROR: Missing required fields: {missing_fields}")
                return
            
            # Pastikan semua path menggunakan format yang benar
            if model and not os.path.isabs(model):
                model = str((APP_DIR / model).resolve())
            if creds and not os.path.isabs(creds):
                creds = str((APP_DIR / creds).resolve())
            
            cmd = [
                self._python_exe(),
                str(Path(self.main_v2_path)),
                "--source", source,
                "--model", model,
                "--creds", creds,
                "--sheet_id", sheet_id,
                "--worksheet", worksheet,
                "--plate", plate,
                "--notify_token", notify_token,
                "--notify_chat_id", notify_chat,
            ]
            
            # Tambahkan system token/chat jika ada
            if system_token:
                cmd.extend(["--system_token", system_token])
            if system_chat:
                cmd.extend(["--system_chat_id", system_chat])
            
            # Tambahkan confidence dan IoU ke command
            cmd.extend(["--conf", self.detection_conf])
            cmd.extend(["--iou", self.detection_iou])
            
            # Debug: tampilkan command yang akan dijalankan (tanpa token lengkap untuk keamanan)
            cmd_display = cmd.copy()
            for i, arg in enumerate(cmd_display):
                if "token" in arg.lower() and i + 1 < len(cmd_display):
                    cmd_display[i + 1] = cmd_display[i + 1][:10] + "..." if len(cmd_display[i + 1]) > 10 else cmd_display[i + 1]
            self.log(f"Command preview: {' '.join(cmd_display[:6])}...")
            # Buat log file untuk debugging
            log_file = APP_DIR / "logs" / "main_v2_log.txt"
            try:
                with open(log_file, "w", encoding="utf-8") as f:
                    f.write(f"Starting main_v2.py at {datetime.datetime.now()}\n")
                    f.write(f"Command: {' '.join(cmd)}\n")
                    f.write(f"Working directory: {APP_DIR}\n\n")
            except Exception as e:
                self.log(f"Warning: Could not write to log file: {e}")
            
            # Buka log file untuk append
            try:
                log_handle = open(log_file, "a", encoding="utf-8", buffering=1)  # Line buffering
            except Exception as e:
                self.log(f"Warning: Could not write to log file: {e}")
            
            # Buka log file untuk append
            try:
                log_handle = open(log_file, "a", encoding="utf-8", buffering=1)  # Line buffering
                # Jangan gunakan CREATE_NO_WINDOW untuk main_v2 karena perlu window OpenCV
                process = subprocess.Popen(
                cmd,
                cwd=str(APP_DIR),
                    stdout=log_handle,
                    stderr=subprocess.STDOUT,
                    # Hapus CREATE_NO_WINDOW agar window OpenCV bisa muncul
                    # creationflags=(subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0),
                )
                # Jangan tutup log_handle, biarkan process yang mengelolanya
                self.log(f"Menjalankan Main V2... PID: {process.pid}")
                self.log(f"Log file: {log_file}")
                self.log(f"Command: {' '.join(cmd[:5])}... (lihat log untuk lengkapnya)")
            except Exception as e:
                if 'log_handle' in locals():
                    log_handle.close()
                raise
        except Exception as e:
            messagebox.showerror("Gagal menjalankan Main V2", str(e))

    def stop_main_v2(self) -> None:
        n = kill_process("integrated_main.py")
        n += kill_process("main_v2.py") # Kill both just in case
        self.log(f"Integrated Server dihentikan (terminated={n}).")

    def toggle_main_v2(self) -> None:
        messagebox.showinfo("Legacy Info", "Main V2 has been archived. Please use Main V3.")
        # if is_process_running("integrated_main.py") or is_process_running("main_v2.py"):
        #     self.stop_main_v2()
        # else:
        #     self.start_main_v2()

    def start_bot(self, auto_start_qr: bool = True) -> None:
        try:
            if is_process_running("telegram_monitor_bot.py"):
                self.log("Bot monitor sudah berjalan.")
                return
            
            # Start bot monitor
            cmd = [self._python_exe(), str(Path(self.bot_monitor_path))]
            subprocess.Popen(
                cmd,
                cwd=str(APP_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=(subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0),
            )
            self.log("Menjalankan Bot Monitor...")
 
            # Otomatis start QR standby jika belum berjalan
            if auto_start_qr:
                time.sleep(2)  # Tunggu bot start dulu
                if not is_process_running("qr_standby.py"):
                    self.log("Otomatis start QR Standby karena Bot Monitor dinyalakan...")
                    self.start_qr()
        except Exception as e:
            messagebox.showerror("Gagal menjalankan Bot", str(e))

    def stop_bot(self) -> None:
        n = kill_process("telegram_monitor_bot.py")
        self.log(f"Bot monitor dihentikan (terminated={n}).")

    def toggle_bot(self) -> None:
        if is_process_running("telegram_monitor_bot.py"):
            self.stop_bot()
        else:
            self.start_bot(auto_start_qr=True)

    def stop_main_v3(self) -> None:
        n = kill_process("src.detection.gui_version_partial.main") # Kill new module execution
        n += kill_process("gui_version_partial.main") # Kill old module execution
        n += kill_process("main.py") # Fallback
        self.log(f"Main V3 dihentikan (terminated={n}).")

    def toggle_main_v3(self) -> None:
        """Menjalankan Main V3 (Multiprocessing Architecture)"""
        if is_process_running("src.detection.gui_version_partial.main") or is_process_running("gui_version_partial.main") or is_process_running("main.py"): 
            self.stop_main_v3()
        else:
            try:
                if is_process_running("qr_standby.py"):
                    self.stop_qr()
                
                # Auto Start Bot if not running
                if not is_process_running("telegram_monitor_bot.py"):
                     self.start_bot(auto_start_qr=False)

                self.log("Persiapan Start Main V3 (Multiprocessing)...")
                
                # Ensure API server uses Main V3 internal HTTP stream
                self.config_data["stream_mode"] = "http"
                self.config_data["stream_url"] = "http://localhost:5002/video_feed"
                save_config(self.config_data)
                self.log("Config: stream_mode=http (Main V3 via port 5002)")
                
                # Ambil args dari UI
                def get_value(entry, placeholder=""):
                    val = entry.get().strip()
                    return "" if val == placeholder else val

                source = get_value(self.entry_source, "rtsp://username:password@ip:port/path")
                if not source: source = "0"
                     
                cmd = [
                    self._python_exe(),
                    "-m", "src.detection.gui_version_partial.main",
                    "--source", source,
                    "--model", self.entry_model.get().strip(),
                    "--creds", self.entry_creds.get().strip(),
                    "--sheet_id", get_value(self.entry_sheet, "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"),
                    "--worksheet", self.entry_ws.get().strip(),
                    "--plate", self.entry_plate.get().strip(),
                    "--notify_token", get_value(self.entry_notify_token, "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"),
                    "--notify_chat_id", get_value(self.entry_notify_chat, "-1001234567890"),
                    "--conf", self.detection_conf,
                    "--iou", self.detection_iou
                ]
                
                if self.v4_enabled:
                    cmd.append("--v4")
                    self.log("V4 Mode ACTIVATED: Persistence & Fast Entry enabled.")
                    
                    # Auto start bot if V4 is enabled
                    if not is_process_running("telegram_monitor_bot.py"):
                        self.log("V4 Active: Auto-starting Telegram Monitor Bot...")
                        self.start_bot(auto_start_qr=False)
                else:
                    self.log("V4 Mode DEACTIVATED: Running standard V3 logic.")
                
                # LOG THE FULL COMMAND for debugging
                self.log(f"CMD Start: {' '.join(cmd)}")
                
                # Create separate console window
                creation_flags = subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
                
                subprocess.Popen(
                    cmd,
                    cwd=str(APP_DIR),
                    creationflags=creation_flags
                )
                self.log("Main V3 telah dijalankan di window baru.")
            except Exception as e:
                messagebox.showerror("Gagal V3", str(e))

    def open_log(self) -> None:
        logfile = APP_DIR / "logs" / "monitor_log.txt"
        if not logfile.exists():
            self.log("monitor_log.txt tidak ditemukan.")
            return
        try:
            if os.name == "nt":
                os.startfile(str(logfile))  # type: ignore[attr-defined]
            else:
                subprocess.Popen(["xdg-open", str(logfile)])
        except Exception as e:
            self.log(f"Gagal membuka log: {e}")

    # ====== Login & Akun ======
    def _login_flow(self) -> bool:
        accounts = self.config_data.get("accounts", [])
        if not accounts:
            # Buat akun pertama
            messagebox.showinfo("Buat Akun", "Belum ada akun. Silakan buat akun admin pertama.")
            return self._register_account()
        # Dialog login
        return self._login_dialog()

    def _register_account(self) -> bool:
        u = simpledialog.askstring("Akun Baru", "Username:", parent=self)
        if not u:
            return False
        p = simpledialog.askstring("Akun Baru", "Password:", parent=self, show="*")
        if not p:
            return False
        self.config_data.setdefault("accounts", []).append({"username": u, "password": p})
        save_config(self.config_data)
        messagebox.showinfo("Sukses", "Akun dibuat. Silakan login.")
        return self._login_dialog()

    def _login_dialog(self) -> bool:
        for _ in range(3):
            u = simpledialog.askstring("Login", "Username:", parent=self)
            if u is None:
                return False
            p = simpledialog.askstring("Login", "Password:", parent=self, show="*")
            if p is None:
                return False
            if any(acc.get("username") == u and acc.get("password") == p for acc in self.config_data.get("accounts", [])):
                self.current_username = u
                self.log(f"Login berhasil sebagai {u}.")
                return True
            messagebox.showerror("Login gagal", "Username atau password salah.")
        return False

    # ====== Profil CCTV ======
    def _collect_args(self) -> dict:
        def get_value(entry, placeholder=""):
            val = entry.get().strip()
            return "" if val == placeholder else val
            
        return {
            "source": get_value(self.entry_source, "rtsp://username:password@ip:port/path"),
            "model": self.entry_model.get().strip(),
            "creds": self.entry_creds.get().strip(),
            "sheet_id": get_value(self.entry_sheet, "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"),
            "worksheet": self.entry_ws.get().strip(),
            "plate": self.entry_plate.get().strip(),
            "system_token": get_value(self.entry_system_token, "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"),
            "system_chat": get_value(self.entry_system_chat, "-1001234567890"),
            "notify_token": get_value(self.entry_notify_token, "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"),
            "notify_chat": get_value(self.entry_notify_chat, "-1001234567890"),
            "conf": self.detection_conf,  # Tambahkan confidence
            "iou": self.detection_iou,    # Tambahkan IoU
        }

    def _fill_args(self, d: dict) -> None:
        self._set_entry(self.entry_source, d.get("source", ""))
        self._set_entry(self.entry_model, d.get("model", str((APP_DIR / "models" / "bestbaru.engine").resolve())))
        self._set_entry(self.entry_creds, d.get("creds", str((APP_DIR / "credentials.json").resolve())))
        self._set_entry(self.entry_sheet, d.get("sheet_id", ""))
        self._set_entry(self.entry_ws, d.get("worksheet", "AUTO_ID"))
        self._set_entry(self.entry_plate, d.get("plate", "UNKNOWN"))
        self._set_entry(self.entry_system_token, d.get("system_token", ""))
        self._set_entry(self.entry_system_chat, d.get("system_chat", ""))
        self._set_entry(self.entry_notify_token, d.get("notify_token", ""))
        self._set_entry(self.entry_notify_chat, d.get("notify_chat", ""))
        # Load detection settings
        self.detection_conf = d.get("conf", "0.25")
        self.detection_iou = d.get("iou", "0.35")

    def _set_entry(self, entry: tk.Entry, value: str) -> None:
        entry.delete(0, tk.END)
        if value:
            entry.insert(0, value)
            entry.configure(foreground="black")
        else:
            # Set placeholder jika kosong
            if entry == self.entry_source:
                placeholder = "rtsp://username:password@ip:port/path"
            elif entry == self.entry_sheet:
                placeholder = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            elif entry == self.entry_system_token:
                placeholder = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            elif entry == self.entry_system_chat:
                placeholder = "-1001234567890"
            elif entry == self.entry_notify_token:
                placeholder = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            elif entry == self.entry_notify_chat:
                placeholder = "-1001234567890"
            else:
                placeholder = ""
            
            if placeholder:
                entry.insert(0, placeholder)
                entry.configure(foreground="gray")

    def load_profile(self) -> None:
        name = self.profile_var.get().strip()
        profiles = self.config_data.get("profiles", {})
        if not name or name not in profiles:
            self.log("Profil tidak ditemukan.")
            return
        profile_data = profiles[name]
        self._fill_args(profile_data)
        # Load detection settings dari profile
        self.detection_conf = profile_data.get("conf", "0.25")
        self.detection_iou = profile_data.get("iou", "0.35")
        self.config_data["last_profile"] = name
        save_config(self.config_data)
        self.log(f"Profil '{name}' dimuat.")
        # Verifikasi bahwa semua field terisi
        missing = []
        if not self.entry_source.get().strip() or self.entry_source.get().strip() == "rtsp://username:password@ip:port/path":
            missing.append("RTSP/Source")
        if not self.entry_model.get().strip():
            missing.append("Model")
        if not self.entry_creds.get().strip():
            missing.append("Google Creds")
        if not self.entry_sheet.get().strip() or self.entry_sheet.get().strip() == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms":
            missing.append("Sheet ID")
        if not self.entry_ws.get().strip():
            missing.append("Worksheet")
        if not self.entry_plate.get().strip():
            missing.append("Plate")
        if not self.entry_notify_token.get().strip() or self.entry_notify_token.get().strip() == "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz":
            missing.append("QR Notify Token")
        if not self.entry_notify_chat.get().strip() or self.entry_notify_chat.get().strip() == "-1001234567890":
            missing.append("QR Notify Chat ID")
        if missing:
            self.log(f"PERINGATAN: Profil '{name}' tidak lengkap. Field kosong: {', '.join(missing)}")

    def _auto_start_services(self) -> None:
        """Auto start Main V3 + Bot jika enabled"""
        if not self.auto_start_enabled:
            return

        self.log("Auto Start: Memulai Main V3 + Bot Monitor...")

        # Start Bot Monitor terlebih dahulu
        if not is_process_running("telegram_monitor_bot.py"):
            self.start_bot(auto_start_qr=False)
            time.sleep(2)  # Tunggu bot start

        # Start Main V3 (gui_version_partial)
        if not (is_process_running("src.detection.gui_version_partial.main") or is_process_running("gui_version_partial.main") or is_process_running("main.py")):
            self.toggle_main_v3()

        self.log("Auto Start: Main V3 + Bot Monitor telah dimulai.")

    def delete_profile(self) -> None:
        name = self.profile_var.get().strip()
        if not name:
            return
        if messagebox.askyesno("Hapus Profil", f"Hapus profil '{name}'?"):
            self.config_data.get("profiles", {}).pop(name, None)
            if self.config_data.get("last_profile") == name:
                self.config_data["last_profile"] = ""
            save_config(self.config_data)
            self.profile_var.set("")
            self.profile_combo.configure(values=sorted(list(self.config_data.get("profiles", {}).keys())))
            self.log(f"Profil '{name}' dihapus.")

    # ====== Advanced Settings ======
    def open_advanced_settings(self) -> None:
        """Membuka dialog Advanced Settings dengan tabbed interface"""
        if not self.current_username:
            messagebox.showerror("Error", "Anda belum login.")
            return

        # Buat dialog window
        dialog = tk.Toplevel(self)
        dialog.title("Advanced Settings")
        dialog.geometry("700x650")  # Diperbesar sedikit
        dialog.resizable(True, True)
        dialog.transient(self)
        dialog.grab_set()

        # Create notebook (tabbed interface)
        notebook = ttk.Notebook(dialog)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # ====== TAB 1: Profile CCTV ======
        profile_frame = ttk.Frame(notebook, padding=20)
        notebook.add(profile_frame, text="Profile CCTV")
        
        # Scrollable frame untuk profile
        canvas = tk.Canvas(profile_frame)
        scrollbar = ttk.Scrollbar(profile_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Field Nama Profile (harus diisi saat menyimpan)
        row = 0
        ttk.Label(scrollable_frame, text="Nama Profile:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_name_entry = ttk.Entry(scrollable_frame, width=50, font=("Segoe UI", 10))
        profile_name_entry.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        # Isi dengan profile yang sedang dipilih jika ada
        current_profile = self.profile_var.get()
        if current_profile:
            profile_name_entry.insert(0, current_profile)
        row += 1
        
        # Separator
        ttk.Separator(scrollable_frame, orient=tk.HORIZONTAL).grid(row=row, column=0, columnspan=2, sticky=tk.EW, pady=10)
        row += 1
        
        # Field Profile CCTV (semua field sensitif)
        ttk.Label(scrollable_frame, text="RTSP/Source:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_source = ttk.Entry(scrollable_frame, width=50)
        profile_source.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_source.insert(0, self.entry_source.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="Model:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_model = ttk.Entry(scrollable_frame, width=50)
        profile_model.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_model.insert(0, self.entry_model.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="Google Creds:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_creds = ttk.Entry(scrollable_frame, width=50)
        profile_creds.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_creds.insert(0, self.entry_creds.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="Sheet ID:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_sheet = ttk.Entry(scrollable_frame, width=50)
        profile_sheet.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_sheet.insert(0, self.entry_sheet.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="Worksheet:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_ws = ttk.Entry(scrollable_frame, width=50)
        profile_ws.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_ws.insert(0, self.entry_ws.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="Plate:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_plate = ttk.Entry(scrollable_frame, width=50)
        profile_plate.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_plate.insert(0, self.entry_plate.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="System Bot Token:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_system_token = ttk.Entry(scrollable_frame, width=50)
        profile_system_token.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_system_token.insert(0, self.entry_system_token.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="System Chat ID:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_system_chat = ttk.Entry(scrollable_frame, width=50)
        profile_system_chat.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_system_chat.insert(0, self.entry_system_chat.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="QR Notify Token:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_notify_token = ttk.Entry(scrollable_frame, width=50)
        profile_notify_token.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_notify_token.insert(0, self.entry_notify_token.get())
        row += 1
        
        ttk.Label(scrollable_frame, text="QR Notify Chat ID:", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky=tk.W, pady=5)
        profile_notify_chat = ttk.Entry(scrollable_frame, width=50)
        profile_notify_chat.grid(row=row, column=1, sticky=tk.W, padx=10, pady=5)
        profile_notify_chat.insert(0, self.entry_notify_chat.get())
        row += 1
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        def save_profile_settings():
            """Simpan semua field profile dengan nama yang diisi"""
            profile_name = profile_name_entry.get().strip()
            
            if not profile_name:
                messagebox.showerror("Error", "Nama Profile harus diisi terlebih dahulu!", parent=dialog)
                return
            
            # Update entry fields internal
            self._set_entry(self.entry_source, profile_source.get().strip())
            self._set_entry(self.entry_model, profile_model.get().strip())
            self._set_entry(self.entry_creds, profile_creds.get().strip())
            self._set_entry(self.entry_sheet, profile_sheet.get().strip())
            self._set_entry(self.entry_ws, profile_ws.get().strip())
            self._set_entry(self.entry_plate, profile_plate.get().strip())
            self._set_entry(self.entry_system_token, profile_system_token.get().strip())
            self._set_entry(self.entry_system_chat, profile_system_chat.get().strip())
            self._set_entry(self.entry_notify_token, profile_notify_token.get().strip())
            self._set_entry(self.entry_notify_chat, profile_notify_chat.get().strip())
            
            # Simpan ke config dengan nama profile
            profile_data = self._collect_args()
            self.config_data.setdefault("profiles", {})[profile_name] = profile_data
            self.config_data["last_profile"] = profile_name
            save_config(self.config_data)
            
            # Update combo box
            self.profile_var.set(profile_name)
            self.profile_combo.configure(values=sorted(list(self.config_data.get("profiles", {}).keys())))
            
            messagebox.showinfo("Sukses", f"Profile '{profile_name}' berhasil disimpan.", parent=dialog)
            self.log(f"Profile '{profile_name}' disimpan.")
        
        ttk.Button(profile_frame, text="Simpan Profile", command=save_profile_settings).pack(pady=10)
        
        # ====== TAB 2: Detection Settings ======
        # Buat frame utama dengan scrollbar untuk Detection Settings
        detection_container = ttk.Frame(notebook)
        notebook.add(detection_container, text="Detection Settings")
        
        # Canvas dan scrollbar untuk scrollable content
        detection_canvas = tk.Canvas(
            detection_container, 
            bg='white',
            highlightthickness=0,
            borderwidth=0
        )
        detection_scrollbar = ttk.Scrollbar(
            detection_container, 
            orient=tk.VERTICAL, 
            command=detection_canvas.yview
        )
        detection_frame = ttk.Frame(detection_canvas)
        
        # Buat window untuk frame di canvas
        detection_frame_window = detection_canvas.create_window((0, 0), window=detection_frame, anchor="nw")
        
        # Update canvas width saat resize
        def on_detection_canvas_configure(event):
            """Update canvas window width saat canvas di-resize"""
            try:
                canvas_width = event.width
                if canvas_width > 1:
                    detection_canvas.itemconfig(detection_frame_window, width=canvas_width)
            except Exception:
                pass
        
        def configure_detection_scroll_region(event):
            """Update scroll region saat frame berubah"""
            try:
                # Update scroll region
                bbox = detection_canvas.bbox("all")
                if bbox:
                    detection_canvas.configure(scrollregion=bbox)
                    # Paksa update scrollbar
                    detection_canvas.update_idletasks()
                # Update canvas window width
                canvas_width = detection_canvas.winfo_width()
                if canvas_width > 1:
                    detection_canvas.itemconfig(detection_frame_window, width=canvas_width)
            except Exception:
                pass
        
        detection_frame.bind("<Configure>", configure_detection_scroll_region)
        detection_canvas.bind('<Configure>', on_detection_canvas_configure)
        detection_canvas.configure(yscrollcommand=detection_scrollbar.set)
        
        # Pack canvas dan scrollbar - pastikan scrollbar selalu terlihat
        detection_scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 0))
        detection_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 0))
        
        # Pastikan scrollbar terlihat dengan memaksa update
        detection_canvas.update_idletasks()
        
        # Bind mouse wheel untuk scrolling canvas - lebih reliable
        def on_detection_mousewheel(event):
            """Handler untuk mouse wheel scrolling pada canvas"""
            try:
                # Windows
                if event.delta:
                    detection_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
                # Linux/Mac
                elif event.num == 4:
                    detection_canvas.yview_scroll(-1, "units")
                elif event.num == 5:
                    detection_canvas.yview_scroll(1, "units")
            except Exception:
                pass
        
        # Bind mouse wheel ke canvas dan semua child widget
        def bind_mousewheel_to_all(widget, func):
            """Recursively bind mouse wheel ke widget dan semua child"""
            widget.bind("<MouseWheel>", func)
            widget.bind("<Button-4>", func)  # Linux scroll up
            widget.bind("<Button-5>", func)  # Linux scroll down
            for child in widget.winfo_children():
                try:
                    bind_mousewheel_to_all(child, func)
                except:
                    pass
        
        # Bind mouse wheel ke canvas dan frame
        bind_mousewheel_to_all(detection_canvas, on_detection_mousewheel)
        bind_mousewheel_to_all(detection_frame, on_detection_mousewheel)
        bind_mousewheel_to_all(detection_container, on_detection_mousewheel)
        
        # Focus pada canvas saat mouse enter agar mouse wheel bekerja
        def on_canvas_enter(event):
            """Set focus saat mouse masuk canvas"""
            detection_canvas.focus_set()
        
        def on_canvas_leave(event):
            """Hapus focus saat mouse keluar"""
            pass
        
        # Bind untuk focus agar mouse wheel bekerja
        detection_canvas.bind("<Enter>", on_canvas_enter)
        detection_canvas.bind("<Leave>", on_canvas_leave)
        detection_canvas.bind("<Button-1>", lambda e: detection_canvas.focus_set())
        
        # Bind mouse wheel ke dialog dan notebook sebagai fallback untuk scroll
        def on_dialog_mousewheel(event):
            """Handler untuk mouse wheel di dialog - fallback untuk scroll"""
            try:
                # Cek apakah sedang di tab Detection Settings (index 1)
                if notebook.index(notebook.select()) == 1:
                    # Cek apakah mouse ada di area canvas
                    try:
                        x, y = event.x_root, event.y_root
                        canvas_x = detection_canvas.winfo_rootx()
                        canvas_y = detection_canvas.winfo_rooty()
                        canvas_w = detection_canvas.winfo_width()
                        canvas_h = detection_canvas.winfo_height()
                        
                        if (canvas_x <= x <= canvas_x + canvas_w and 
                            canvas_y <= y <= canvas_y + canvas_h):
                            on_detection_mousewheel(event)
                            return "break"
                    except:
                        pass
            except Exception:
                pass
        
        # Bind ke container dan notebook
        detection_container.bind("<MouseWheel>", on_dialog_mousewheel)
        notebook.bind("<MouseWheel>", on_dialog_mousewheel)
        
        # Padding untuk detection_frame content
        # Title
        title_label = ttk.Label(detection_frame, text="Pengaturan Akurasi Deteksi Icetube", font=("Segoe UI", 12, "bold"))
        title_label.pack(pady=(20, 20), padx=20)
        
        # Confidence
        conf_frame = ttk.LabelFrame(detection_frame, text="Confidence Threshold", padding=15)
        conf_frame.pack(fill=tk.X, pady=10, padx=20)
        
        ttk.Label(conf_frame, text="Nilai Confidence:").pack(anchor=tk.W)
        conf_var = tk.StringVar(value=self.detection_conf)
        conf_entry = ttk.Entry(conf_frame, textvariable=conf_var, width=20, font=("Segoe UI", 10))
        conf_entry.pack(anchor=tk.W, pady=5)
        
        conf_info = "Range: 0.15 - 0.5\n"
        conf_info += "• Lebih rendah (0.15-0.2): Lebih banyak deteksi, lebih banyak noise\n"
        conf_info += "• Sedang (0.25-0.3): Seimbang antara akurasi dan noise\n"
        conf_info += "• Lebih tinggi (0.35-0.5): Lebih sedikit noise, mungkin miss beberapa objek"
        ttk.Label(conf_frame, text=conf_info, justify=tk.LEFT, foreground="gray").pack(anchor=tk.W, pady=5)
        
        # IoU
        iou_frame = ttk.LabelFrame(detection_frame, text="IoU Threshold", padding=15)
        iou_frame.pack(fill=tk.X, pady=10, padx=20)
        
        ttk.Label(iou_frame, text="Nilai IoU:").pack(anchor=tk.W)
        iou_var = tk.StringVar(value=self.detection_iou)
        iou_entry = ttk.Entry(iou_frame, textvariable=iou_var, width=20, font=("Segoe UI", 10))
        iou_entry.pack(anchor=tk.W, pady=5)
        
        iou_info = "Range: 0.25 - 0.5\n"
        iou_info += "• Lebih rendah (0.25-0.3): Lebih banyak deteksi, mungkin duplicate\n"
        iou_info += "• Sedang (0.35-0.4): Seimbang\n"
        iou_info += "• Lebih tinggi (0.45-0.5): Lebih sedikit duplicate detection"
        ttk.Label(iou_frame, text=iou_info, justify=tk.LEFT, foreground="gray").pack(anchor=tk.W, pady=5)
        
        # Info umum - menggunakan Text widget dengan scrollbar
        info_frame = ttk.LabelFrame(detection_frame, text="Informasi", padding=15)
        info_frame.pack(fill=tk.X, pady=10, padx=20)  # Hanya fill X, tidak expand
        
        # Frame untuk Text widget dan scrollbar
        info_text_frame = ttk.Frame(info_frame)
        info_text_frame.pack(fill=tk.BOTH, expand=False)  # Tidak expand terlalu banyak
        
        # Text widget dengan scrollbar - set height yang fixed
        info_text = tk.Text(
            info_text_frame, 
            wrap=tk.WORD,
            width=60,
            height=10,  # Height fixed agar tidak terlalu besar
            font=("Segoe UI", 9),
            foreground="blue",
            background="white",
            relief=tk.SUNKEN,
            borderwidth=2,
            padx=5,
            pady=5
        )
        
        # Scrollbar untuk Text widget
        info_scrollbar = ttk.Scrollbar(info_text_frame, orient=tk.VERTICAL, command=info_text.yview)
        info_text.configure(yscrollcommand=info_scrollbar.set)
        
        # Pack Text dan Scrollbar - konsisten menggunakan pack
        info_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        info_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Isi teks informasi
        general_info = "💡 Tips:\n\n"
        general_info += "• Jika banyak noise terdeteksi:\n"
        general_info += "  Tingkatkan Confidence (0.3-0.4)\n\n"
        general_info += "• Jika banyak duplicate detection:\n"
        general_info += "  Tingkatkan IoU (0.4-0.5)\n\n"
        general_info += "• Jika banyak miss detection:\n"
        general_info += "  Turunkan Confidence (0.2-0.25)\n\n"
        general_info += "• Pengaturan akan diterapkan saat menjalankan Main V2 atau Main V3\n\n"
        general_info += "📝 Catatan:\n"
        general_info += "• Confidence: Tingkat keyakinan deteksi (0.1-1.0)\n"
        general_info += "• IoU: Intersection over Union untuk filter duplicate (0.1-1.0)\n"
        general_info += "• Nilai lebih tinggi = lebih ketat/strict\n"
        general_info += "• Nilai lebih rendah = lebih longgar/more detection"
        
        # Insert teks ke Text widget
        info_text.insert("1.0", general_info)
        info_text.config(state=tk.DISABLED)  # Read-only
        
        # Enable mouse wheel scrolling
        def _on_mousewheel(event):
            """Handler untuk mouse wheel scrolling"""
            try:
                info_text.yview_scroll(int(-1 * (event.delta / 120)), "units")
            except Exception:
                # Fallback untuk Linux/Mac
                if event.num == 4:
                    info_text.yview_scroll(-1, "units")
                elif event.num == 5:
                    info_text.yview_scroll(1, "units")
            return "break"
        
        # Bind mouse wheel untuk scrolling Text widget - lebih reliable
        def bind_mousewheel_to_text(widget, func):
            """Recursively bind mouse wheel ke widget dan semua child"""
            widget.bind("<MouseWheel>", func)
            widget.bind("<Button-4>", func)  # Linux scroll up
            widget.bind("<Button-5>", func)  # Linux scroll down
            for child in widget.winfo_children():
                try:
                    bind_mousewheel_to_text(child, func)
                except:
                    pass
        
        bind_mousewheel_to_text(info_text, _on_mousewheel)
        bind_mousewheel_to_text(info_text_frame, _on_mousewheel)
        bind_mousewheel_to_text(info_frame, _on_mousewheel)
        
        def save_detection_settings():
            """Simpan detection settings"""
            try:
                conf_val = float(conf_var.get())
                iou_val = float(iou_var.get())
                
                if not (0.1 <= conf_val <= 1.0):
                    messagebox.showerror("Error", "Confidence harus antara 0.1 dan 1.0", parent=dialog)
                    return
                if not (0.1 <= iou_val <= 1.0):
                    messagebox.showerror("Error", "IoU harus antara 0.1 dan 1.0", parent=dialog)
                    return
                
                self.detection_conf = str(conf_val)
                self.detection_iou = str(iou_val)
                
                # Simpan ke global config agar persist setelah restart
                self.config_data["last_conf"] = self.detection_conf
                self.config_data["last_iou"] = self.detection_iou
                
                # Update juga ke profile yang sedang aktif jika ada
                current_profile = self.profile_var.get().strip()
                if current_profile and current_profile in self.config_data.get("profiles", {}):
                    self.config_data["profiles"][current_profile]["conf"] = self.detection_conf
                    self.config_data["profiles"][current_profile]["iou"] = self.detection_iou
                
                save_config(self.config_data)
                
                messagebox.showinfo("Sukses", 
                                  f"Pengaturan detection berhasil disimpan.\n\n"
                                  f"Confidence: {conf_val}\n"
                                  f"IoU: {iou_val}\n\n"
                                  f"Pengaturan akan diterapkan saat menjalankan Main V2 atau Main V3.", 
                                  parent=dialog)
            except ValueError:
                messagebox.showerror("Error", "Confidence dan IoU harus berupa angka.", parent=dialog)
        
        # Button frame - buat lebih menonjol
        btn_frame = ttk.Frame(detection_frame)
        btn_frame.pack(pady=30, fill=tk.X, padx=20)
        
        # Tombol Simpan - besar dan hijau agar jelas terlihat
        btn_save = tk.Button(
            btn_frame, 
            text="💾 Simpan Detection Settings", 
            command=save_detection_settings,
            font=("Segoe UI", 11, "bold"),
            bg="#4CAF50",
            fg="white",
            activebackground="#45a049",
            activeforeground="white",
            width=35,
            height=2,
            cursor="hand2"
        )
        btn_save.pack(side=tk.LEFT, padx=5)
        
        # Tombol Reset - orange
        btn_reset = tk.Button(
            btn_frame, 
            text="🔄 Reset ke Default", 
            command=lambda: [
                conf_var.set("0.25"),
                iou_var.set("0.35")
            ],
            font=("Segoe UI", 10),
            bg="#FF9800",
            fg="white",
            activebackground="#F57C00",
            activeforeground="white",
            width=20,
            height=2,
            cursor="hand2"
        )
        btn_reset.pack(side=tk.LEFT, padx=5)
        
        # Tombol Batal - merah
        btn_cancel = tk.Button(
            btn_frame, 
            text="❌ Batal", 
            command=dialog.destroy,
            font=("Segoe UI", 10),
            bg="#f44336",
            fg="white",
            activebackground="#da190b",
            activeforeground="white",
            width=15,
            height=2,
            cursor="hand2"
        )
        btn_cancel.pack(side=tk.LEFT, padx=5)
        
        # ====== TAB 3: Auto Start Settings ======
        autostart_frame = ttk.Frame(notebook, padding=20)
        notebook.add(autostart_frame, text="Auto Start")
        
        # Title
        title_label_autostart = tk.Label(
            autostart_frame, 
            text="Pengaturan Auto Start", 
            font=("Segoe UI", 14, "bold")
        )
        title_label_autostart.pack(pady=(0, 30))
        
        # Auto Start Toggle Frame
        autostart_toggle_frame = ttk.LabelFrame(
            autostart_frame, 
            text="Aktifkan Auto Start", 
            padding=20
        )
        autostart_toggle_frame.pack(fill=tk.X, pady=10)
        
        # Checkbox - menggunakan tk.Checkbutton untuk visibility lebih baik
        autostart_var = tk.BooleanVar(value=self.auto_start_enabled)
        
        # Frame untuk checkbox agar lebih jelas
        checkbox_container = tk.Frame(autostart_toggle_frame, bg='white')
        checkbox_container.pack(anchor=tk.W, pady=(0, 20), fill=tk.X)
        
        autostart_checkbox = tk.Checkbutton(
            checkbox_container,
            text="Aktifkan Auto Start Main V2 + Bot saat startup",
            variable=autostart_var,
            font=("Segoe UI", 11, "bold"),
            bg='white',
            activebackground='white',
            selectcolor='lightblue',
            relief=tk.FLAT,
            bd=0
        )
        autostart_checkbox.pack(anchor=tk.W, side=tk.LEFT)
        
        # Info text
        autostart_info = "Jika diaktifkan:\n"
        autostart_info += "• Main V2 dan Bot Monitor akan otomatis menyala setelah login\n"
        autostart_info += "• Tidak perlu menekan tombol secara manual\n"
        autostart_info += "• Berguna untuk menjalankan sistem secara otomatis"
        
        info_label = tk.Label(
            autostart_toggle_frame, 
            text=autostart_info, 
            justify=tk.LEFT, 
            fg="gray",
            bg='white',
            font=("Segoe UI", 9)
        )
        info_label.pack(anchor=tk.W, pady=10, padx=5)
        
        def save_autostart_settings():
            """Simpan auto start settings"""
            self.auto_start_enabled = autostart_var.get()
            self.config_data["auto_start"] = self.auto_start_enabled
            save_config(self.config_data)
            
            status_text = "diaktifkan" if self.auto_start_enabled else "dinonaktifkan"
            messagebox.showinfo(
                "Sukses", 
                f"Auto Start berhasil {status_text}.\n\n"
                f"Pengaturan akan diterapkan saat restart aplikasi.", 
                parent=dialog
            )
            self.log(f"Auto Start {status_text}.")
        
        # Button frame - pastikan terlihat di bawah
        btn_frame_autostart = ttk.Frame(autostart_frame)
        btn_frame_autostart.pack(pady=40, fill=tk.X)
        
        btn_save_autostart = tk.Button(
            btn_frame_autostart, 
            text="Simpan Auto Start Settings", 
            command=save_autostart_settings,
            font=("Segoe UI", 10, "bold"),
            bg="#4CAF50",
            fg="white",
            activebackground="#45a049",
            activeforeground="white",
            width=30,
            height=2
        )
        btn_save_autostart.pack(side=tk.LEFT, padx=5)
        
        btn_cancel_autostart = tk.Button(
            btn_frame_autostart, 
            text="Batal", 
            command=dialog.destroy,
            font=("Segoe UI", 10),
            bg="#f44336",
            fg="white",
            activebackground="#da190b",
            activeforeground="white",
            width=20,
            height=2
        )
        btn_cancel_autostart.pack(side=tk.LEFT, padx=5)
        
        # ====== TAB 4: Password ======
        password_frame = ttk.Frame(notebook, padding=20)
        notebook.add(password_frame, text="Password")

        # ID (Username)
        ttk.Label(password_frame, text="ID (Username):").grid(row=0, column=0, sticky=tk.W, pady=5)
        entry_id = ttk.Entry(password_frame, width=30)
        entry_id.grid(row=0, column=1, sticky=tk.W, pady=5, padx=10)
        entry_id.insert(0, self.current_username or "")

        # Password saat ini
        ttk.Label(password_frame, text="Password Saat Ini:").grid(row=1, column=0, sticky=tk.W, pady=5)
        entry_current_pw = ttk.Entry(password_frame, width=30, show="*")
        entry_current_pw.grid(row=1, column=1, sticky=tk.W, pady=5, padx=10)

        # Password baru
        ttk.Label(password_frame, text="Password Baru:").grid(row=2, column=0, sticky=tk.W, pady=5)
        entry_new_pw = ttk.Entry(password_frame, width=30, show="*")
        entry_new_pw.grid(row=2, column=1, sticky=tk.W, pady=5, padx=10)

        # Konfirmasi Password baru
        ttk.Label(password_frame, text="Konfirmasi Password Baru:").grid(row=3, column=0, sticky=tk.W, pady=5)
        entry_confirm_pw = ttk.Entry(password_frame, width=30, show="*")
        entry_confirm_pw.grid(row=3, column=1, sticky=tk.W, pady=5, padx=10)

        def do_change_password() -> None:
            username = entry_id.get().strip()
            current_pw = entry_current_pw.get()
            new_pw = entry_new_pw.get()
            confirm_pw = entry_confirm_pw.get()

            # Validasi
            if not username:
                messagebox.showerror("Error", "ID tidak boleh kosong.", parent=dialog)
                return
            
            if not current_pw:
                messagebox.showerror("Error", "Password saat ini harus diisi.", parent=dialog)
                return
            
            if not new_pw:
                messagebox.showerror("Error", "Password baru tidak boleh kosong.", parent=dialog)
                return
            
            if new_pw != confirm_pw:
                messagebox.showerror("Error", "Konfirmasi password baru tidak cocok.", parent=dialog)
                return
            
            if len(new_pw) < 3:
                messagebox.showerror("Error", "Password baru minimal 3 karakter.", parent=dialog)
                return

            # Cari akun di config
            accounts = self.config_data.get("accounts", [])
            account_found = False
            
            for acc in accounts:
                if acc.get("username") == username:
                    # Verifikasi password saat ini
                    if acc.get("password") != current_pw:
                        messagebox.showerror("Error", "Password saat ini salah.", parent=dialog)
                        return
                    
                    # Update password
                    acc["password"] = new_pw
                    account_found = True
                    break
            
            if not account_found:
                messagebox.showerror("Error", "Akun tidak ditemukan.", parent=dialog)
                return

            # Simpan config
            save_config(self.config_data)
            messagebox.showinfo("Sukses", "Password berhasil diperbarui.", parent=dialog)
            self.log(f"Password untuk akun '{username}' telah diperbarui.")
            entry_current_pw.delete(0, tk.END)
            entry_new_pw.delete(0, tk.END)
            entry_confirm_pw.delete(0, tk.END)

        # Tombol
        btn_frame_pw = ttk.Frame(password_frame)
        btn_frame_pw.grid(row=4, column=0, columnspan=2, pady=30)

        btn_update_pw = tk.Button(
            btn_frame_pw, 
            text="Perbarui Password", 
            command=do_change_password,
            font=("Segoe UI", 10, "bold"),
            bg="#4CAF50",
            fg="white",
            activebackground="#45a049",
            activeforeground="white",
            width=25,
            height=2
        )
        btn_update_pw.pack(side=tk.LEFT, padx=5)
        
        btn_cancel_pw = tk.Button(
            btn_frame_pw, 
            text="Batal", 
            command=dialog.destroy,
            font=("Segoe UI", 10),
            bg="#f44336",
            fg="white",
            activebackground="#da190b",
            activeforeground="white",
            width=20,
            height=2
        )
        btn_cancel_pw.pack(side=tk.LEFT, padx=5)

        # Focus ke entry password saat ini
        entry_current_pw.focus()


def main() -> None:
    if psutil is None:
        messagebox.showwarning(
            "Peringatan",
            "psutil tidak terpasang. Status/proses tidak bisa dipantau. Jalankan: pip install psutil",
        )
    app = ControlPanel()
    app.mainloop()


if __name__ == "__main__":
    main()

