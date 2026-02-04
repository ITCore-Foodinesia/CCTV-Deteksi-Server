# 📦 Panduan Deploy Perubahan Terbaru

## Sistem Monitoring CCTV Gudang + Dashboard React + Supabase Integration

---

**Tanggal Pembuatan:** 4 Februari 2026  
**Target:** Server PC di lokasi gudang  
**Versi Sistem:** 4.0.5

---

## 📋 Daftar Isi

1. [Ringkasan Perubahan](#-ringkasan-perubahan)
2. [Prasyarat](#-prasyarat)
3. [Langkah 1: Deploy Database (Supabase)](#-langkah-1-deploy-database-supabase)
4. [Langkah 2: Deploy Dashboard (React)](#-langkah-2-deploy-dashboard-react)
5. [Langkah 3: Deploy Engine (Python)](#-langkah-3-deploy-engine-python)
6. [Verifikasi Deployment](#-verifikasi-deployment)
7. [Troubleshooting](#-troubleshooting)
8. [Rollback Plan](#-rollback-plan)

---

## 🆕 Ringkasan Perubahan

### Apa yang baru?

| Komponen | Perubahan | Dampak |
|----------|-----------|--------|
| **Database** | Migrasi baru: kolom untuk CCTV engine + tabel helpers/loaders | Realtime sync dengan Flutter & Dashboard |
| **Dashboard** | React hooks untuk Supabase + realtime updates | Data dari database, bukan mock |
| **Engine** | `SessionListener` untuk trigger-based detection | Mulai/stop counting otomatis dari Flutter |

### Arsitektur Baru

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  FLUTTER APP    │────►│    SUPABASE         │◄────│  CCTV ENGINE    │
│  (Driver)       │     │  (loading_sessions) │     │  (Python)       │
└─────────────────┘     └──────────┬──────────┘     └─────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
              ┌─────────────────┐      ┌─────────────────┐
              │  DASHBOARD      │      │  FLUTTER APP    │
              │  (React Admin)  │      │  (Real-time UI) │
              └─────────────────┘      └─────────────────┘
```

---

## ✅ Prasyarat

### Di Server PC

- [ ] **Windows 10/11** dengan akses Administrator
- [ ] **Python 3.11+** sudah terinstall
- [ ] **Node.js 18+** sudah terinstall
- [ ] **Git** sudah terinstall
- [ ] **NVIDIA GPU Driver** (untuk TensorRT)
- [ ] **Koneksi internet** stabil (untuk akses Supabase)

### Akses yang Dibutuhkan

- [ ] Akses ke **Supabase Dashboard** (login credentials)
- [ ] Akses ke **repository project** (Git pull)
- [ ] **RTSP URL** kamera CCTV sudah diketahui

### File Credentials (jangan commit ke Git!)

- [ ] `credentials.json` - Google Service Account
- [ ] `.env` file - Supabase keys

---

## 🗄️ Langkah 1: Deploy Database (Supabase)

### 1.1 Login ke Supabase Dashboard

1. Buka browser dan kunjungi: **https://supabase.com/dashboard**
2. Login dengan akun yang sudah terdaftar
3. Pilih project: **cctv-deteksi** (atau nama project Anda)

### 1.2 Jalankan Migration Script

1. Di sidebar, klik **SQL Editor**
2. Klik tombol **+ New query**
3. Buka file [`dashboard/supabase/migrations/001_saas_ready_schema.sql`](../dashboard/supabase/migrations/001_saas_ready_schema.sql) di komputer Anda
4. Copy seluruh isi file dan paste ke SQL Editor
5. Klik **Run** (tombol hijau di pojok kanan atas)
6. Tunggu hingga muncul pesan "Success"

### 1.3 Jalankan Migration Kedua (Engine Integration)

1. Buat query baru: klik **+ New query**
2. Buka file [`dashboard/supabase/migrations/002_cctv_engine_integration.sql`](../dashboard/supabase/migrations/002_cctv_engine_integration.sql)
3. Copy seluruh isi file dan paste ke SQL Editor
4. Klik **Run**
5. Tunggu hingga muncul pesan "Success"

### 1.4 Verifikasi Database

Jalankan query ini untuk memastikan migrasi berhasil:

```sql
-- Cek tabel baru
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'loading_sessions', 'helpers', 'loaders', 'cctv_engine_state');

-- Cek kolom baru di loading_sessions
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'loading_sessions'
AND column_name IN ('plate_number', 'counting_active', 'loading_count', 'rehab_count');
```

**Hasil yang diharapkan:**
- Minimal 5 tabel ditemukan
- Minimal 4 kolom baru di loading_sessions

### 1.5 Catat Credentials Supabase

1. Di sidebar, klik **Settings** → **API**
2. Catat informasi berikut:

| Setting | Nilai | Keterangan |
|---------|-------|------------|
| **Project URL** | `https://xxxxx.supabase.co` | Untuk Dashboard & Engine |
| **anon public key** | `eyJhbGci...` | Untuk Dashboard (client-side) |
| **service_role key** | `eyJhbGci...` | Untuk Engine saja (jangan expose!) |

⚠️ **PENTING**: `service_role key` hanya untuk backend/engine. JANGAN masukkan ke kode frontend!

---

## 💻 Langkah 2: Deploy Dashboard (React)

### 2.1 Pull Kode Terbaru

Buka **Command Prompt** atau **PowerShell** sebagai Administrator:

```cmd
cd C:\path\ke\cctv-deteksi
git pull origin main
```

### 2.2 Masuk ke Folder Dashboard

```cmd
cd dashboard
```

### 2.3 Install Dependencies

```cmd
npm install
```

**Tunggu sampai selesai** (biasanya 1-3 menit tergantung koneksi).

### 2.4 Konfigurasi Environment Variables

1. Copy file contoh:

```cmd
copy .env.example .env
```

2. Edit file `.env` dengan Notepad atau editor lain:

```cmd
notepad .env
```

3. Ubah nilai sesuai environment Anda:

```env
# ================
# API SERVER (pilih salah satu)
# ================

# Opsi 1: Untuk akses lokal saja
VITE_API_URL=http://localhost:5001
VITE_EDGE_URL=http://localhost:5001

# Opsi 2: Untuk akses dari jaringan lokal
# VITE_API_URL=http://192.168.1.XX:5001
# VITE_EDGE_URL=http://192.168.1.XX:5001

# ================
# SUPABASE (WAJIB diisi)
# ================
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...paste_anon_key_dari_supabase...
```

4. Simpan file (Ctrl+S) dan tutup editor

### 2.5 Build untuk Production

```cmd
npm run build
```

**Hasil:** folder `dist` akan dibuat dengan file production-ready.

### 2.6 Jalankan Dashboard (Development Mode)

Untuk testing:

```cmd
npm run dev
```

Dashboard akan berjalan di: **http://localhost:5173**

### 2.7 (Opsional) Deploy ke Static Server

Jika ingin di-serve dari server web:

```cmd
npm run preview
```

Atau copy folder `dist` ke web server (Apache/Nginx/IIS).

---

## ⚙️ Langkah 3: Deploy Engine (Python)

### 3.1 Masuk ke Folder Engine

Dari folder root project:

```cmd
cd gui_version_testing_with_server
```

### 3.2 Aktifkan Virtual Environment (Opsional tapi Disarankan)

Jika menggunakan venv:

```cmd
python -m venv venv
venv\Scripts\activate
```

### 3.3 Install Dependencies

```cmd
pip install -r requirements.txt
```

**Dependensi penting yang ditambahkan:**
- `supabase>=2.0.0` - Supabase Python client
- `realtime>=1.0.0` - Realtime subscription

### 3.4 Konfigurasi Environment Variables

Buat file `.env` di folder `gui_version_testing_with_server`:

```cmd
notepad .env
```

Isi dengan:

```env
# Supabase Credentials
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...paste_service_role_key...

# Alternatif jika pakai anon key (tidak recommended)
# SUPABASE_ANON_KEY=eyJhbGci...
```

⚠️ **PENTING**: 
- Gunakan `SUPABASE_SERVICE_ROLE_KEY` agar engine bisa bypass RLS
- JANGAN commit file `.env` ke Git!

### 3.5 Konfigurasi Server (unified_server.json)

Edit atau buat file `config/unified_server.json`:

```cmd
notepad config\unified_server.json
```

Contoh konfigurasi:

```json
{
  "host": "0.0.0.0",
  "port": 5001,
  "debug": false,
  "enable_tui": false,
  
  "capture": {
    "source": "rtsp://admin:password@192.168.1.100:554/stream1",
    "width": 1280,
    "height": 720,
    "target_fps": 15,
    "jpeg_quality": 65,
    "detection_enabled": true,
    "model_path": "best.engine",
    "buffer_size": 3,
    "reconnect_delay": 2.0
  },
  
  "supabase": {
    "enabled": true
  },
  
  "sheets": {
    "enabled": false
  },
  
  "telegram": {
    "enabled": false
  }
}
```

**Ubah sesuai kebutuhan:**
- `source`: URL RTSP kamera Anda
- `model_path`: Path ke model TensorRT engine

### 3.6 Test Supabase Connection

Buat file test sederhana untuk memastikan koneksi:

```cmd
python -c "from src.integrations.supabase import SessionListener; print('Import OK')"
```

Jika tidak ada error, koneksi module berhasil.

### 3.7 Jalankan Engine dengan Supabase Integration

#### Opsi A: Menggunakan SessionListener (Recommended)

Buat script launcher baru atau modifikasi existing script:

```python
# start_with_supabase.py
from src.integrations.supabase import SessionListener

def on_session_start(session_data):
    """Dipanggil saat Flutter memulai loading session"""
    print(f"🚛 Mulai counting untuk: {session_data.get('plate_number', 'N/A')}")
    # TODO: Integrasikan dengan detection engine Anda
    # - Start counting logic
    # - Set camera focus ke dock tertentu
    
def on_session_stop(session_id):
    """Dipanggil saat session selesai/dibatalkan"""
    print(f"✅ Stop counting untuk session: {session_id}")
    # TODO: Stop counting, simpan hasil

# Inisialisasi listener
listener = SessionListener(
    on_session_start=on_session_start,
    on_session_stop=on_session_stop
)

# Mulai listening
print("🔊 Listening for session changes...")
listener.start()

# Keep running (atau integrasikan ke main loop Anda)
try:
    import time
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    listener.stop()
    print("👋 Listener stopped")
```

Jalankan:

```cmd
python start_with_supabase.py
```

#### Opsi B: Menggunakan API Server Existing

Jika sudah ada API server yang berjalan:

```cmd
python src/api/api_server.py
```

---

## ✔️ Verifikasi Deployment

### Checklist Verifikasi

| No | Item | Cara Cek | Expected |
|----|------|----------|----------|
| 1 | Database migrasi | Query tabel di Supabase | Semua tabel ada |
| 2 | Dashboard connect ke Supabase | Buka dashboard, cek Console | Tidak ada error koneksi |
| 3 | Dashboard menampilkan data | Buka halaman Drivers/Docks | Data dari database muncul |
| 4 | Engine connect ke Supabase | Jalankan engine, cek log | "SessionListener initialized" |
| 5 | Realtime working | Buat session dari Flutter | Engine menerima event |

### Test Realtime (End-to-End)

1. **Buka Dashboard** di browser: `http://localhost:5173`
2. **Jalankan Engine** di terminal
3. **Di Supabase SQL Editor**, insert test session:

```sql
INSERT INTO loading_sessions (
    tenant_id, 
    driver_id, 
    truck_id, 
    dock_id,
    status, 
    plate_number
) VALUES (
    'YOUR_TENANT_ID',  -- Ganti dengan tenant_id yang valid
    'YOUR_DRIVER_ID',  -- Ganti dengan driver_id yang valid
    'YOUR_TRUCK_ID',   -- Ganti dengan truck_id yang valid
    'YOUR_DOCK_ID',    -- Ganti dengan dock_id yang valid
    'loading',
    'TEST-123'
);
```

4. **Cek Engine log**: harus muncul event "Mulai counting untuk: TEST-123"
5. **Cek Dashboard**: session baru harus muncul di list

---

## 🔧 Troubleshooting

### Masalah: "SUPABASE_URL not found"

**Penyebab:** Environment variable tidak ter-set.

**Solusi:**
1. Pastikan file `.env` ada di folder yang benar
2. Pastikan nama variable benar (case-sensitive)
3. Restart terminal/aplikasi setelah edit `.env`

### Masalah: "supabase module not found"

**Penyebab:** Dependencies belum terinstall.

**Solusi:**
```cmd
pip install supabase realtime
```

### Masalah: Dashboard tidak menampilkan data

**Penyebab:** Kemungkinan RLS blocking atau tenant_id tidak match.

**Solusi:**
1. Cek browser Console untuk error
2. Di Supabase, cek apakah RLS policy sudah benar
3. Pastikan user login memiliki akses ke tenant

### Masalah: Realtime tidak bekerja

**Penyebab:** Publication/replication belum diaktifkan.

**Solusi:**
1. Di Supabase Dashboard, buka **Database** → **Replication**
2. Pastikan tabel `loading_sessions` ter-enable
3. Atau jalankan:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE loading_sessions;
```

### Masalah: Engine crash saat start

**Penyebab:** TensorRT engine tidak kompatibel atau GPU issue.

**Solusi:**
1. Rebuild TensorRT engine:
```cmd
python scripts/rebuild_engine.py
```

2. Cek GPU tersedia:
```cmd
nvidia-smi
```

---

## ↩️ Rollback Plan

Jika deployment gagal dan perlu rollback:

### Rollback Database

Jalankan rollback statements dari [`002_cctv_engine_integration.sql`](../dashboard/supabase/migrations/002_cctv_engine_integration.sql):

```sql
-- Remove columns from loading_sessions
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS plate_number;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS plate_detected;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS counting_active;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS counting_started_at;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS loading_count;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS rehab_count;

-- Remove indexes
DROP INDEX IF EXISTS idx_loading_sessions_plate_number;
DROP INDEX IF EXISTS idx_loading_sessions_plate_detected;
DROP INDEX IF EXISTS idx_loading_sessions_active;

-- Remove trigger
DROP TRIGGER IF EXISTS trg_session_change ON loading_sessions;
DROP FUNCTION IF EXISTS notify_session_change();

-- Remove tables
DROP TABLE IF EXISTS cctv_engine_state;
DROP TABLE IF EXISTS helpers;
DROP TABLE IF EXISTS loaders;
```

### Rollback Dashboard

```cmd
cd dashboard
git checkout HEAD~1 -- src/hooks/
git checkout HEAD~1 -- src/pages/
npm run build
```

### Rollback Engine

```cmd
cd gui_version_testing_with_server
git checkout HEAD~1 -- src/integrations/supabase/
```

---

## 📞 Kontak Bantuan

Jika mengalami kesulitan saat deployment, hubungi:

- **Developer Lead**: [Nama/Email]
- **DevOps**: [Nama/Email]

---

## 📎 File Referensi

| File | Lokasi | Deskripsi |
|------|--------|-----------|
| Migration 1 | [`dashboard/supabase/migrations/001_saas_ready_schema.sql`](../dashboard/supabase/migrations/001_saas_ready_schema.sql) | Schema dasar SaaS |
| Migration 2 | [`dashboard/supabase/migrations/002_cctv_engine_integration.sql`](../dashboard/supabase/migrations/002_cctv_engine_integration.sql) | Integrasi Engine |
| Env Example | [`dashboard/.env.example`](../dashboard/.env.example) | Contoh environment dashboard |
| Engine Listener | [`gui_version_testing_with_server/src/integrations/supabase/supabase_listener.py`](../gui_version_testing_with_server/src/integrations/supabase/supabase_listener.py) | Supabase realtime listener |
| Server Config | [`gui_version_testing_with_server/config/unified_server_example.json`](../gui_version_testing_with_server/config/unified_server_example.json) | Contoh config server |

---

*Dokumen terakhir diperbarui: 4 Februari 2026*
