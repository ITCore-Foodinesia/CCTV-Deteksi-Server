# 📊 Dashboard Versions

Project ini memiliki 2 versi dashboard yang bisa dipilih sesuai kebutuhan.

## Version 1: Integrated (WebSocket) - **CURRENT**

**File:** `src/App.jsx` → `WarehouseAIDashboard.jsx`

### Features:
- ✅ Real-time updates via WebSocket
- ✅ Live CCTV streaming dari backend
- ✅ Dynamic stats dari API
- ✅ Activity logs broadcasting
- ✅ Connection status monitoring
- ✅ FPS & latency tracking

### Structure:
```jsx
WarehouseAIDashboard (Main)
├── Header (Connection status)
├── StatsCard x4 (Metrics)
├── CCTVFeed (Live stream)
└── ActivityLog (Real-time logs)
```

### Dependencies:
- Backend API running (`api_server.py`)
- WebSocket connection
- `.env` configured

### Run:
```bash
# Start backend first
python api_server.py

# Then start dashboard
npm run dev
```

---

## Version 2: Standalone (UI Reference) - **NEW**

**File:** `src/components/WarehouseAIDashboardStandalone.jsx`

### Features:
- ✅ Match 100% dengan `ui-db.png` reference
- ✅ Self-contained (no external dependencies)
- ✅ Static data untuk demo
- ✅ Clean, minimal layout
- ✅ All-in-one component
- ✅ Easy to customize

### Structure:
```jsx
WarehouseAIDashboardStandalone (Single file)
├── Header (inline)
├── Stats Cards (inline)
├── CCTV Feed (placeholder)
└── Activity Logs (inline)
```

### Dependencies:
- None! Standalone component
- Static data only
- No backend required

### Run:
```bash
# Option 1: Rename files
mv src/App.jsx src/App-WebSocket.jsx
mv src/App-Standalone.jsx src/App.jsx
npm run dev

# Option 2: Edit App.jsx manually
# Change import to WarehouseAIDashboardStandalone

# Option 3: Create new entry point
# See usage example below
```

---

## 🔄 How to Switch Between Versions

### Method 1: Edit `App.jsx`

**For WebSocket version:**
```jsx
import WarehouseAIDashboard from './components/WarehouseAIDashboard'

function App() {
  return <WarehouseAIDashboard />
}

export default App
```

**For Standalone version:**
```jsx
import WarehouseAIDashboardStandalone from './components/WarehouseAIDashboardStandalone'

function App() {
  return <WarehouseAIDashboardStandalone />
}

export default App
```

### Method 2: Environment Variable

Create `.env.local`:
```env
VITE_DASHBOARD_VERSION=standalone
# or
VITE_DASHBOARD_VERSION=websocket
```

Update `App.jsx`:
```jsx
import WarehouseAIDashboard from './components/WarehouseAIDashboard'
import WarehouseAIDashboardStandalone from './components/WarehouseAIDashboardStandalone'

function App() {
  const version = import.meta.env.VITE_DASHBOARD_VERSION || 'websocket'
  
  return version === 'standalone' 
    ? <WarehouseAIDashboardStandalone />
    : <WarehouseAIDashboard />
}

export default App
```

### Method 3: Route-based

Install React Router:
```bash
npm install react-router-dom
```

Update `App.jsx`:
```jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import WarehouseAIDashboard from './components/WarehouseAIDashboard'
import WarehouseAIDashboardStandalone from './components/WarehouseAIDashboardStandalone'

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav style={{ padding: '10px', background: '#f0f0f0' }}>
          <Link to="/">WebSocket Version</Link> | 
          <Link to="/standalone">Standalone Version</Link>
        </nav>
        
        <Routes>
          <Route path="/" element={<WarehouseAIDashboard />} />
          <Route path="/standalone" element={<WarehouseAIDashboardStandalone />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
```

---

## 📊 Comparison

| Feature | WebSocket Version | Standalone Version |
|---------|-------------------|-------------------|
| **Backend Required** | ✅ Yes | ❌ No |
| **Real-time Updates** | ✅ Yes | ❌ Static |
| **Live CCTV Stream** | ✅ Yes | ❌ Placeholder |
| **Complexity** | 🔴 High | 🟢 Low |
| **Setup Time** | 5-10 min | 1 min |
| **Use Case** | Production | Demo/UI Dev |
| **File Size** | Multiple files | Single file |
| **Customization** | Moderate | Easy |
| **Performance** | Good | Excellent |

---

## 🎯 When to Use Each Version

### Use **WebSocket Version** when:
- ✅ Building production system
- ✅ Need real-time monitoring
- ✅ Backend API available
- ✅ Multiple users accessing
- ✅ Scalability needed

### Use **Standalone Version** when:
- ✅ Quick demo/presentation
- ✅ UI development/testing
- ✅ No backend available
- ✅ Learning/training
- ✅ Static data sufficient
- ✅ Single user/offline use

---

## 🔧 Customization Tips

### Standalone Version

**Change stats data:**
```jsx
const [stats] = useState({
  inbound: 200,    // Your value
  outbound: 150,   // Your value
  trucks: 8,       // Your value
  capacity: 92     // Your value
});
```

**Add more logs:**
```jsx
const [logs] = useState([
  { id: 1, time: '10:42', type: 'inbound', ... },
  { id: 2, time: '10:38', type: 'outbound', ... },
  // Add more...
]);
```

**Change CCTV image:**
```jsx
<div className="absolute inset-0 bg-[url('YOUR_IMAGE_URL')] bg-cover bg-center opacity-80"></div>
```

### WebSocket Version

**API endpoint:**
Edit `.env`:
```env
VITE_API_URL=http://your-server:5001
```

**Refresh rate:**
Edit `useWebSocket.js` for custom intervals

---

## 📝 Notes

- **Standalone version** adalah replika UI yang exact match dengan `ui-db.png`
- **WebSocket version** adalah implementation production-ready
- Kedua version menggunakan styling yang sama (Tailwind CSS)
- Data structure compatible antara kedua version

---

## 🚀 Quick Start

### Demo Mode (Standalone)
```bash
# 1. Edit App.jsx to use Standalone
# 2. Run
npm run dev
# 3. Open http://localhost:5173
```

### Production Mode (WebSocket)
```bash
# 1. Start backend
python api_server.py

# 2. Start dashboard (App.jsx already configured)
npm run dev

# 3. Open http://localhost:5173
```

---

**Current Active Version:** WebSocket (Integrated)

**To activate Standalone:** Edit `src/App.jsx` and change import to `WarehouseAIDashboardStandalone`
