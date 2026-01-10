# 🔄 Quick Switch to Standalone Version

Untuk menggunakan tampilan yang **exact match dengan ui-db.png**, ikuti langkah berikut:

## Option 1: Quick Edit (Recommended)

1. **Open** `src/App.jsx`

2. **Replace** isi file dengan:

```jsx
import WarehouseAIDashboardStandalone from './components/WarehouseAIDashboardStandalone'

function App() {
  return <WarehouseAIDashboardStandalone />
}

export default App
```

3. **Save** dan dashboard akan auto-reload

4. **Done!** Dashboard sekarang menggunakan UI standalone

---

## Option 2: Backup Current Version

Jika ingin keep both versions:

```bash
# Backup current App.jsx
mv src/App.jsx src/App-WebSocket.jsx

# Use standalone version
cp src/App-Standalone.jsx src/App.jsx

# Run
npm run dev
```

**To switch back:**
```bash
mv src/App-WebSocket.jsx src/App.jsx
```

---

## Option 3: Command Line (PowerShell)

```powershell
# Navigate to dashboard folder
cd dashboard-ui

# Backup current
Copy-Item src\App.jsx src\App-WebSocket-Backup.jsx

# Create new App.jsx with standalone
@"
import WarehouseAIDashboardStandalone from './components/WarehouseAIDashboardStandalone'

function App() {
  return <WarehouseAIDashboardStandalone />
}

export default App
"@ | Out-File -FilePath src\App.jsx -Encoding utf8

# Run
npm run dev
```

---

## ✅ Verify It's Working

After switch, you should see:
- ✅ Stats cards di atas (Barang Masuk, Keluar, Truck, Kapasitas)
- ✅ CCTV feed besar di kiri dengan bounding boxes
- ✅ Activity logs di kanan dengan "LISTENING FOR EVENTS..." 
- ✅ No WebSocket connection (standalone!)
- ✅ Clean layout match dengan ui-db.png

---

## 🔙 Switch Back to WebSocket Version

Edit `src/App.jsx` kembali ke:

```jsx
import WarehouseAIDashboard from './components/WarehouseAIDashboard'

function App() {
  return <WarehouseAIDashboard />
}

export default App
```

---

## 📝 Differences

**Current (WebSocket):**
- Real-time updates
- Needs backend running
- Dynamic data

**Standalone:**
- Static data
- No backend needed  
- Exact match ui-db.png
- Perfect for demo

---

## 🎯 Quick Commands

```bash
# Current directory should be: dashboard-ui/

# Edit App.jsx to standalone
code src/App.jsx  # Then change import manually

# Or use PowerShell one-liner
'import WarehouseAIDashboardStandalone from "./components/WarehouseAIDashboardStandalone"`n`nfunction App() {`n  return <WarehouseAIDashboardStandalone />`n}`n`nexport default App' | Out-File src/App.jsx -Encoding utf8

# Run dashboard
npm run dev
```

---

**Done!** Dashboard sekarang match 100% dengan ui-db.png reference! 🎉
