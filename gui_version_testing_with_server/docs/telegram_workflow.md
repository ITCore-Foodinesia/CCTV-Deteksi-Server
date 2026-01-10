# INSTALL LIBRARY YANG DIPERLUKAN
pip install fastapi uvicorn python-telegram-bot python-dotenv requests

# ALUR KERJA START/STOP LOADING VIA TELEGRAM BOT

Dokumen ini menjelaskan bagaimana proses backend bekerja saat operator menekan tombol di Bot Telegram.

## 1. Interaksi User (Telegram)
- Operator membuka bot dan memilih plat nomor dari Menu.
- Bot menampilkan Dashboard Control dengan tombol "▶️ START LOADING".

## 2. Proses START Loading
Saat tombol "▶️ START LOADING" ditekan:

### A. Bot Logic (`telegram_loading_dashboard.py`):
1.  Menerima callback event `action_start`.
2.  Menjalankan fungsi `start_main_process(plate)`.
3.  Fungsi ini mengeksekusi perintah command line (subprocess) untuk menyalakan `main_v2.py`:
    `python main_v2.py --source ... --plate "KT 8899 TEST" ...`
4.  Status sistem diupdate menjadi "LOADING".
5.  Bot mengirim update ke API Server (`POST /api/telegram_update`) agar Web Dashboard juga berubah statusnya menjadi "LOADING".
6.  Pesan di Telegram diedit menjadi "🚀 Started at HH:MM:SS" dan tombol berubah menjadi "⏹️ STOP LOADING".

### B. Main Engine (`main_v2.py`):
1.  Script mulai berjalan sebagai proses terpisah.
2.  Menerima argumen `--plate` dari perintah di atas.
3.  Menginisialisasi deteksi video dan penghitungan barang.
4.  Secara berkala (setiap 1 detik), `main_v2` juga melakukan polling ke API Server (`GET /api/state`) untuk memastikan sinkronisasi data (fitur baru yang ditambahkan).

## 3. Proses STOP Loading
Saat tombol "⏹️ STOP LOADING" ditekan:

### A. Bot Logic (`telegram_loading_dashboard.py`):
1.  Menerima callback event `action_stop`.
2.  Menjalankan fungsi `stop_main_process()`.
3.  Fungsi ini mengirim sinyal TERMINATE ke proses `main_v2.py` yang sedang berjalan.
4.  Jika proses tidak mati dalam 5 detik, bot akan memaksanya mati (KILL).
5.  Status sistem diupdate menjadi "STOPPED".
6.  Bot mengirim update ke API Server (`POST /api/telegram_update`).
7.  Pesan di Telegram diedit menjadi "🛑 Stopped at HH:MM:SS" dan tombol kembali ke menu awal.

## 4. Sinkronisasi Data (API Server)
- `api_server.py` bertindak sebagai penghubung status.
- Menerima info dari Bot Telegram dan meneruskannya ke Web Dashboard (React) via WebSocket.
- Menyediakan endpoint `/api/state` agar `main_v2.py` bisa mengetahui status terkini jika diperlukan.
