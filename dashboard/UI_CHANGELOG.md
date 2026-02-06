# Dashboard UI Changelog

Dokumentasi perubahan UI pada Warehouse AI Dashboard.

---

## 2026-01-18: Loading Dock Status Logic

### **Dynamic Loading Dock Display Based on Jam Datang/Jam Selesai**

**Files Modified:**

- [`src/hooks/useWebSocket.js`](src/hooks/useWebSocket.js)
- [`src/components/WarehouseAIDashboard.jsx`](src/components/WarehouseAIDashboard.jsx)

**Implementation Plan:** [`plans/LOADING_DOCK_STATUS_IMPLEMENTATION.md`](../plans/LOADING_DOCK_STATUS_IMPLEMENTATION.md)

**Logic Rules:**

| State               | Kondisi                              | Loading Dock Card                                     | Stat Card "Loading Truk Terakhir" |
| ------------------- | ------------------------------------ | ----------------------------------------------------- | --------------------------------- |
| **Sedang Loading**  | `jam_datang` ✅ AND `jam_selesai` ❌ | 🟡 Amber bg, Plat Number, "Sedang Loading • HH:MM:SS" | Plat sebelumnya atau N/A          |
| **Selesai Loading** | `jam_datang` ✅ AND `jam_selesai` ✅ | 🟣 Violet bg, "Tidak Ada Loading"                     | ✅ Plat yang baru selesai         |
| **Tidak Ada Data**  | `jam_datang` ❌                      | 🟣 Violet bg, "Tidak Ada Loading"                     | N/A                               |

**Perubahan Detail:**

1. **useWebSocket.js** - Added `jam_datang` and `jam_selesai` to initial state:

   ```javascript
   const [sheetsData, setSheetsData] = useState({
     // ... existing fields
     jam_datang: "", // Arrival time - used to detect active loading
     jam_selesai: "", // Completion time - used to detect completed loading
   });
   ```

2. **WarehouseAIDashboard.jsx** - Added `getLoadingStatus()` helper function:

   ```javascript
   const getLoadingStatus = () => {
     const jamDatang = sheetsData.jam_datang?.trim() || '';
     const jamSelesai = sheetsData.jam_selesai?.trim() || '';
     const plate = sheetsData.latest_plate || 'N/A';

     if (jamDatang && !jamSelesai) {
       return { isActiveLoading: true, activePlate: plate, ... };
     }
     if (jamDatang && jamSelesai) {
       return { isActiveLoading: false, lastCompletedPlate: plate, ... };
     }
     return { isActiveLoading: false, lastCompletedPlate: 'N/A', ... };
   };
   ```

3. **Loading Dock Card** - Now dynamic with amber/violet color scheme:
   - Active: Amber background, shows plate number with "Sedang Loading • arrival_time"
   - Idle: Violet background, shows "Tidak Ada Loading"
   - Loader icon spins when active loading

4. **Stats Card "Loading Truk Terakhir"** - Now shows last COMPLETED truck:
   - Uses `loadingStatus.lastCompletedPlate` instead of current plate
   - Badge shows loading/rehab counts only when completed

**Visual Impact:**

- Loading Dock card now visually indicates when a truck is actively loading
- Clear distinction between "active loading" (amber) and "no loading" (violet) states
- Spinner animation on Loader2 icon during active loading

---

## 2026-01-17: UI Enhancement & Data Display Fix

### 1. **Penambahan Logo Icon pada Stat Cards**

**File Modified:** [`src/components/StatsCard.jsx`](src/components/StatsCard.jsx)

**Perubahan:**

- Menambahkan icon logo yang terlihat di pojok kiri atas setiap stat card
- Icon menggunakan ukuran 32x32px (`w-8 h-8`)
- Icon menggunakan warna yang sama dengan tema card (`iconColor` prop)
- Margin bawah 8px (`mb-2`) untuk spacing dengan label

**Kode yang Ditambahkan:**

```jsx
<div className={`mb-2`}>
  <Icon className={`w-8 h-8 ${iconColor}`} />
</div>
```

**Visual Impact:**

- Sebelum: Card hanya menampilkan label, value, dan badge dengan icon background yang transparan
- Sesudah: Card menampilkan icon logo yang jelas dan terlihat di pojok kiri atas, meningkatkan visual hierarchy

**Reference Image:**

- User menyediakan reference image yang menunjukkan logo di setiap stat card

---

### 2. **Perubahan Label Card "Kapasitas" → "Loading Truk Terakhir"**

**File Modified:** [`src/components/WarehouseAIDashboard.jsx`](src/components/WarehouseAIDashboard.jsx)

**Perubahan pada Stats Config (Line 104-106):**

**Sebelum:**

```javascript
{
  icon: Box,
  label: 'Kapasitas',
  value: `${stats.capacity}%`,
  badge: 'Hampir Penuh',
  bgColor: 'bg-amber-100/50 border-amber-100',
  iconColor: 'text-amber-600',
  badgeColor: 'bg-amber-200/50',
}
```

**Sesudah:**

```javascript
{
  icon: Box,
  label: 'Loading Truk Terakhir',
  value: `${stats.capacity}%`,
  badge: 'Loading Sebelumnya',
  bgColor: 'bg-amber-100/50 border-amber-100',
  iconColor: 'text-amber-600',
  badgeColor: 'bg-amber-200/50',
}
```

**Perubahan:**

- Label utama: `"Kapasitas"` → `"Loading Truk Terakhir"`
- Badge bawah: `"Hampir Penuh"` → `"Loading Sebelumnya"`
- Value dan styling tetap sama

**Alasan Perubahan:**

- Menyesuaikan terminologi dengan use case bisnis
- Lebih deskriptif tentang data yang ditampilkan

---

### 3. **Fix Data Display Logic - Prioritas Data Source**

**File Modified:** [`src/components/WarehouseAIDashboard.jsx`](src/components/WarehouseAIDashboard.jsx)

**Problem:**
Dashboard menampilkan nilai yang salah:

- Seharusnya: Barang Masuk = **120**, Barang Keluar = **1** (dari baris terakhir Google Sheets)
- Yang ditampilkan: Barang Masuk = **29**, Barang Keluar = **21**

**Root Cause:**
Logika pengambilan data menggunakan prioritas yang salah:

**Logika Lama (SALAH) - Line 51-52:**

```javascript
const barangMasuk = parseValue(
  sheetsData.loading_count,
  parseValue(sheetsData.latest_loading, stats.inbound || 0),
);
const barangKeluar = parseValue(
  sheetsData.rehab_count,
  parseValue(sheetsData.latest_rehab, stats.outbound || 0),
);
```

**Masalah:**

- Menggunakan `loading_count`/`rehab_count` sebagai prioritas pertama
- `loading_count`/`rehab_count` kemungkinan adalah total akumulasi, bukan nilai baris terakhir
- Seharusnya prioritas adalah `latest_loading`/`latest_rehab` (nilai dari row terakhir)

**Logika Baru (BENAR) - Line 51-52:**

```javascript
const barangMasuk = parseValue(sheetsData.latest_loading, stats.inbound || 0);
const barangKeluar = parseValue(sheetsData.latest_rehab, stats.outbound || 0);
```

**Perubahan:**

- Langsung menggunakan `latest_loading` dan `latest_rehab` dari baris terakhir Google Sheets
- Fallback ke `stats.inbound` / `stats.outbound` jika sheets data tidak tersedia
- Menghapus referensi ke `loading_count` dan `rehab_count`

**Data Flow:**

```
Google Sheets (Row Terakhir)
  ├─ latest_loading (120) → barangMasuk
  └─ latest_rehab (1)     → barangKeluar
                              ↓
                         Total Loading (121)
```

**Debug Logging:**
Tetap mempertahankan console.log untuk monitoring (Line 56-63):

```javascript
console.log("DEBUG Stats:", {
  "sheetsData.latest_loading": sheetsData.latest_loading,
  "sheetsData.latest_rehab": sheetsData.latest_rehab,
  "stats.inbound": stats.inbound,
  "stats.outbound": stats.outbound,
  "barangMasuk (displayed)": barangMasuk,
  "barangKeluar (displayed)": barangKeluar,
});
```

---

### 4. **Backend - Mock Testing Server Update**

**File Modified:** [`gui_version_testing_with_server/src/testing/mock_main_v3.py`](../gui_version_testing_with_server/src/testing/mock_main_v3.py)

**Perubahan Major:**

#### A. **Konversi dari Video Streaming Server → Google Sheets Testing Server**

**Fitur yang Dihapus:**

- ❌ Video streaming endpoint (`/video_feed`)
- ❌ Camera capture loop
- ❌ OpenCV frame processing
- ❌ MJPEG encoding
- ❌ Frame buffer management

**Fitur yang Dipertahankan/Ditambahkan:**

- ✅ Google Sheets polling loop
- ✅ REST API endpoints: `/health`, `/stats`, `/sheets/status`, `/activities`
- ✅ WebSocket support dengan Flask-SocketIO
- ✅ Real-time data broadcasting
- ✅ TUI dashboard support (optional)

#### B. **REST API Endpoints**

**`GET /health`**

```json
{
  "status": "ok",
  "mode": "sheets_testing",
  "uptime": 3600
}
```

**`GET /stats`**

```json
{
  "inbound": 120,
  "outbound": 1,
  "trucks": 1,
  "capacity": 84,
  "fps": 30,
  "latency": 20,
  "status": "running",
  "sheets": { ... }
}
```

**`GET /sheets/status`**

```json
{
  "connected": true,
  "loading_count": 150,
  "rehab_count": 75,
  "latest_loading": 120,
  "latest_rehab": 1,
  "latest_plate": "KT 0960 PO-HINO",
  "latest_driver": "Driver Name",
  "latest_items": "Loading",
  "jam_datang": "14:15:36",
  "jam_selesai": "15:15:36",
  "last_update": 1737105600,
  "error": null
}
```

**`GET /activities`**

```json
[
  {
    "timestamp": "16:30:45",
    "type": "loading",
    "plate": "KT 0960 PO-HINO",
    "driver": "Driver Name",
    "items": "Loading"
  }
]
```

#### C. **WebSocket Events**

**Server → Client Events:**

- `status_update` - System status (Connected/Disconnected)
- `stats_update` - Stats update (inbound, outbound, trucks, etc.)
- `sheets_update` - Google Sheets data update
- `activities_update` - Full activities list
- `new_activity` - Single new activity (real-time)

**Client → Server Events:**

- `connect` - Connection established
- `disconnect` - Connection closed
- `request_stats` - Request stats update
- `request_activities` - Request activities list

**Connection Flow:**

```
Client Connect
  ↓
Server sends initial data:
  ├─ status_update: { status: "Connected" }
  ├─ stats_update: { inbound, outbound, ... }
  ├─ sheets_update: { latest_loading, ... }
  └─ activities_update: [ ... ]
```

#### D. **Google Sheets Polling Logic**

**Function:** `sheets_poll_loop(webapp_url, interval)`

**Process:**

1. Poll Google Apps Script Web App setiap `interval` detik (default: 5s)
2. Parse JSON response
3. Update global `sheets_data` dictionary
4. Update `stats` dictionary dengan nilai dari sheets:
   ```python
   stats['inbound'] = sheets_data['latest_loading']
   stats['outbound'] = sheets_data['latest_rehab']
   stats['trucks'] = 1 if sheets_data['latest_plate'] != 'N/A' else 0
   ```
5. Broadcast via WebSocket:
   ```python
   socketio.emit('sheets_update', sheets_data)
   socketio.emit('stats_update', stats)
   socketio.emit('status_update', {'status': 'Connected'})
   ```
6. Create activity log entry
7. Broadcast new activity via WebSocket

**Error Handling:**

- HTTP errors → set `sheets_data['connected'] = False`
- Timeout → set error message
- Invalid JSON → log error dan skip update
- Retry otomatis setiap polling interval

#### E. **Command Line Usage**

**Basic:**

```bash
python -m src.testing.mock_main_v3
```

**With TUI:**

```bash
python -m src.testing.mock_main_v3 --tui
```

**Custom Interval:**

```bash
python -m src.testing.mock_main_v3 --interval 10
```

**Custom Port:**

```bash
python -m src.testing.mock_main_v3 --port 8000
```

**Custom WebApp URL:**

```bash
python -m src.testing.mock_main_v3 --webapp-url "https://script.google.com/..."
```

**Combined:**

```bash
python -m src.testing.mock_main_v3 --port 5003 --interval 5 --tui
```

#### F. **Data Safety & Type Conversion**

**Helper Function:** `_safe_int(value, default=0)`

**Purpose:**

- Safely convert nilai dari sheets API ke integer
- Handle edge cases: `None`, `""`, invalid strings
- Prevent crashes dari bad data

**Example:**

```python
loading = _safe_int(result.get('latest_loading', 0))
# Handles: None, "", "120", 120, "120.5" → 120
```

---

### 5. **System Status Fix - "System Offline" Issue**

**Problem:**
Dashboard menampilkan "System Offline" meskipun WebSocket connected.

**Root Cause Analysis:**

**File:** [`src/components/Header.jsx`](src/components/Header.jsx) - Line 5

```javascript
const isConnected = status === "Connected";
```

**Status Source:**

- `status` prop dikirim dari [`useWebSocket`](src/hooks/useWebSocket.js) hook
- Default value: `'Disconnected'` (Line 17)
- Diupdate via WebSocket event `status_update` (Line 56-58)

**Problem:**

- WebSocket connection berhasil (`connected = true`)
- Tapi backend tidak mengirim event `status_update` dengan value `"Connected"`
- Status tetap `"Disconnected"` → UI menampilkan "System Offline"

**Solution Implemented:**

**Backend:** [`mock_main_v3.py`](../gui_version_testing_with_server/src/testing/mock_main_v3.py) - Line 89-94

```python
@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    print(f"[WebSocket] Client connected")
    # Send initial status
    emit('status_update', {'status': 'Connected'})  # ← FIX: Kirim status Connected
    emit('stats_update', stats)
    emit('sheets_update', sheets_data)
    emit('activities_update', activities)
```

**Data Flow:**

```
Client connects to WebSocket
  ↓
Backend: handle_connect()
  ├─ emit('status_update', {status: 'Connected'})
  ├─ emit('stats_update', {...})
  ├─ emit('sheets_update', {...})
  └─ emit('activities_update', [...])
  ↓
Frontend: useWebSocket.js
  ├─ socket.on('status_update') → setStatus('Connected')
  ↓
Header.jsx
  ├─ status === 'Connected' → isConnected = true
  ↓
UI Display: "System Online" ✓
```

**Alternative Solution (Frontend Fallback):**

Jika backend tidak reliable, bisa gunakan fallback di [`Header.jsx`](src/components/Header.jsx):

```javascript
// Option 1: Use websocket connection as fallback
const isConnected =
  status === "Connected" || (wsConnected && status !== "Error");

// Option 2: Trust websocket connection only
const isConnected = wsConnected;
```

**Current Implementation:** Backend fix (preferred)

---

## Visual Changes Summary

### Before & After

#### Stat Cards

**Before:**

```
┌─────────────────────┐
│ BARANG MASUK        │
│ 29                  │  ← Nilai salah
│ Loading Truk Terakhir│
└─────────────────────┘
```

**After:**

```
┌─────────────────────┐
│ ↙ (icon terlihat)   │  ← Logo ditambahkan
│ BARANG MASUK        │
│ 120                 │  ← Nilai benar
│ Loading Truk Terakhir│
└─────────────────────┘
```

#### Capacity Card

**Before:**

```
┌─────────────────────┐
│ □ (icon)            │
│ KAPASITAS           │
│ 84%                 │
│ Hampir Penuh        │
└─────────────────────┘
```

**After:**

```
┌─────────────────────┐
│ □ (icon)            │
│ LOADING TRUK TERAKHIR│
│ 84%                 │
│ Loading Sebelumnya  │
└─────────────────────┘
```

#### System Status

**Before:**

```
● System Offline  ← Salah meskipun connected
```

**After:**

```
● System Online   ← Benar
```

---

## Data Source Mapping

### Google Sheets → Dashboard Display

| Google Sheets Column | API Field        | Dashboard Card | Displayed Value |
| -------------------- | ---------------- | -------------- | --------------- |
| Loading (last row)   | `latest_loading` | Barang Masuk   | 120             |
| Rehab (last row)     | `latest_rehab`   | Barang Keluar  | 1               |
| Plat Nomor           | `latest_plate`   | Loading Dock   | KT 0960 PO-HINO |
| Driver               | `latest_driver`  | Loading Dock   | Driver Name     |
| Items                | `latest_items`   | Loading Dock   | Loading         |
| Jam Datang           | `jam_datang`     | -              | 14:15:36        |
| Jam Selesai          | `jam_selesai`    | -              | 15:15:36        |
| SUM(Loading)         | `loading_count`  | ~~Not Used~~   | -               |
| SUM(Rehab)           | `rehab_count`    | ~~Not Used~~   | -               |

**Calculation:**

```javascript
barangMasuk = latest_loading; // 120
barangKeluar = latest_rehab; // 1
totalLoading = barangMasuk + barangKeluar; // 121
```

---

## Testing Checklist

- [x] Stat cards menampilkan icon logo yang terlihat
- [x] Card "Loading Truk Terakhir" menampilkan label dan badge yang benar
- [x] Barang Masuk menampilkan nilai dari `latest_loading` (120)
- [x] Barang Keluar menampilkan nilai dari `latest_rehab` (1)
- [x] Total Loading dikalkulasi dengan benar (121)
- [x] System Status menampilkan "System Online" saat WebSocket connected
- [x] Backend mengirim event `status_update` saat client connect
- [x] Google Sheets polling berjalan dengan interval yang benar
- [x] WebSocket broadcasting berjalan untuk setiap update
- [x] Debug logs menampilkan nilai yang benar di console

---

## Files Modified

1. **Dashboard (Frontend):**
   - [`src/components/StatsCard.jsx`](src/components/StatsCard.jsx) - Added visible icon logo
   - [`src/components/WarehouseAIDashboard.jsx`](src/components/WarehouseAIDashboard.jsx) - Fixed data display logic, updated labels

2. **Backend (Testing Server):**
   - [`gui_version_testing_with_server/src/testing/mock_main_v3.py`](../gui_version_testing_with_server/src/testing/mock_main_v3.py) - Complete refactor to Google Sheets testing server

3. **Documentation:**
   - [`dashboard/UI_CHANGELOG.md`](UI_CHANGELOG.md) - This file

---

## Developer Notes

### Why `latest_loading` instead of `loading_count`?

**`loading_count`** adalah total akumulasi dari seluruh row di Google Sheets (SUM).  
**`latest_loading`** adalah nilai dari kolom Loading di row **terakhir**.

Dashboard menampilkan **data terkini** (truk yang sedang/baru saja loading), bukan total historis.

### Data Flow Diagram

```
Google Sheets (Spreadsheet)
  ↓ (Apps Script API)
Google Apps Script Web App
  ↓ (HTTP GET - polling setiap 5s)
Backend: mock_main_v3.py
  ├─ Parse JSON
  ├─ Update sheets_data
  ├─ Update stats (inbound, outbound)
  └─ Broadcast via WebSocket
      ↓
Frontend: useWebSocket hook
  ├─ Receive stats_update
  ├─ Receive sheets_update
  └─ Update React state
      ↓
Dashboard Components
  ├─ StatsCard (display values)
  ├─ Header (display status)
  └─ ActivityLog (display activities)
```

### WebSocket vs REST API

**WebSocket (Preferred):**

- Real-time updates
- Bi-directional communication
- Lower latency
- Server push capability

**REST API (Fallback):**

- Simple HTTP GET
- Good for initial load
- Polling required for updates
- Higher latency

**Current Implementation:** Both available, WebSocket as primary method.

---

## Known Issues & Future Improvements

### Current Limitations:

1. Mock server tidak streaming video CCTV (by design, untuk testing sheets saja)
2. Activities log dibuat otomatis dari sheets data (bukan dari deteksi real)
3. FPS dan latency adalah nilai fake (30, 20) untuk testing

### Potential Improvements:

1. Add authentication untuk WebSocket connection
2. Add rate limiting untuk API endpoints
3. Add data validation untuk sheets response
4. Add historical data charting
5. Add export functionality untuk activities log
6. Integrate dengan unified server untuk production use

---

## Version History

| Version | Date       | Changes                                                     | Author       |
| ------- | ---------- | ----------------------------------------------------------- | ------------ |
| 1.0     | 2026-01-17 | Initial UI enhancements, data display fix, backend refactor | AI Assistant |

---

**Last Updated:** 2026-01-17  
**Status:** Production Ready ✓
