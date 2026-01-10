# 📹 Warehouse AI Dashboard

Modern, real-time dashboard untuk monitoring CCTV warehouse dengan AI detection.

## ✨ Features

- 🎥 **Live CCTV Streaming** - Real-time video feed dengan low latency
- 📊 **Real-time Stats** - Inbound, Outbound, Trucks, Capacity
- 📝 **Activity Logs** - Live updates via WebSocket
- 🎯 **AI Detection Overlay** - Bounding boxes untuk detected objects
- 📈 **Performance Monitoring** - FPS, Latency tracking
- 🖥️ **Fullscreen Viewer** - Maximize CCTV feed
- 🎨 **Modern UI** - Glassmorphism design dengan Tailwind CSS
- 📱 **Responsive** - Works pada desktop, tablet, dan mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Backend API running (`api_server.py`)

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env to point to your API server
# VITE_API_URL=http://localhost:5001
```

### Development

```bash
# Start dev server
npm run dev

# atau double-click:
# ../start_dashboard.bat
```

Dashboard akan buka di: **http://localhost:5173**

### Build for Production

```bash
npm run build
npm run preview
```

## 🏗️ Project Structure

```
dashboard-ui/
├── src/
│   ├── components/
│   │   ├── WarehouseAIDashboard.jsx  # Main container
│   │   ├── Header.jsx                 # Header dengan status
│   │   ├── StatsCard.jsx              # Metric cards
│   │   ├── CCTVFeed.jsx               # Video player
│   │   └── ActivityLog.jsx            # Log items
│   ├── hooks/
│   │   └── useWebSocket.js            # WebSocket hook
│   ├── services/
│   │   └── api.js                     # API client
│   ├── App.jsx                        # App entry
│   ├── main.jsx                       # React mount
│   └── index.css                      # Global styles
├── public/                            # Static assets
├── .env                               # Environment config
├── vite.config.js                     # Vite config
├── tailwind.config.js                 # Tailwind config
└── package.json                       # Dependencies
```

## 🔌 API Integration

### Backend API

Dashboard connects ke backend API di `http://localhost:5001` (configurable via `.env`)

**Endpoints used:**
- `GET /api/stream/video` - MJPEG video stream
- `GET /api/status` - Stream status
- `GET /api/stats` - Statistics
- `GET /api/activities` - Activity logs

**WebSocket Events:**
- `status_update` - Stream status changed
- `stats_update` - Stats updated
- `new_activity` - New activity added

### Configuration

Edit `.env` file:

```env
# Local development
VITE_API_URL=http://localhost:5001

# For remote access (ganti dengan IP server)
VITE_API_URL=http://192.168.1.100:5001
```

After changing `.env`, rebuild:
```bash
npm run build
```

## 🎨 Components

### WarehouseAIDashboard

Main component yang mengintegrasikan semua sub-components dan WebSocket.

**Features:**
- WebSocket connection management
- State management untuk stats dan activities
- Camera switching
- Layout responsive

### CCTVFeed

Video player dengan features:
- Live stream dari backend
- Loading dan error states
- FPS dan latency display
- Fullscreen support
- Camera switching UI

### ActivityLog

Real-time activity list dengan:
- Inbound/Outbound badges
- Driver information
- Vehicle plate
- Item count
- Status indicator

### StatsCard

Reusable metric card dengan:
- Icon dan color theming
- Value display
- Badge dengan additional info
- Hover animations

### Header

Top header dengan:
- Brand logo
- System status
- WebSocket connection status
- AI model info

## 🎯 Custom Hooks

### useWebSocket

Hook untuk WebSocket connection dan real-time updates.

**Usage:**
```jsx
const {
  connected,      // WebSocket connection status
  stats,          // Real-time stats
  activities,     // Activity logs
  status,         // Stream status
  requestStats,   // Request stats update
  requestActivities // Request activities
} = useWebSocket();
```

**Events handled:**
- `connect` / `disconnect`
- `status_update`
- `stats_update`
- `activities_update`
- `new_activity`

## 🌐 Network Access

### Access dari Device Lain

1. **Get PC IP:**
   ```bash
   ipconfig  # Windows
   ifconfig  # Linux/Mac
   ```

2. **Update .env:**
   ```env
   VITE_API_URL=http://192.168.1.100:5001
   ```

3. **Rebuild:**
   ```bash
   npm run build
   ```

4. **Access:**
   - Dashboard: `http://192.168.1.100:5173`
   - Make sure firewall allows ports!

## 🎛️ Customization

### Change Colors

Edit Tailwind classes di components:

```jsx
// StatsCard colors
const statsConfig = [
  {
    bgColor: 'bg-emerald-100/50',  // Change here
    iconColor: 'text-emerald-600',
    // ...
  }
]
```

### Add New Stats

Tambah ke `statsConfig` array di `WarehouseAIDashboard.jsx`:

```jsx
{
  icon: YourIcon,
  label: 'Your Metric',
  value: stats.yourValue,
  badge: 'Your Badge',
  bgColor: 'bg-blue-100/50 border-blue-100',
  iconColor: 'text-blue-600',
  badgeColor: 'bg-blue-200/50',
}
```

### Update Layout

Edit grid configuration di `WarehouseAIDashboard.jsx`:

```jsx
// Change column spans
<div className="lg:col-span-8">  // Left column
<div className="lg:col-span-4">  // Right column
```

## 🐛 Troubleshooting

### Cannot connect to API

**Check:**
1. Backend running? `curl http://localhost:5001/api/status`
2. `.env` file exists?
3. CORS enabled di backend?

**Solution:**
```bash
# Check backend logs
# Restart both backend dan frontend
```

### WebSocket disconnected

**Check:**
1. Backend WebSocket support enabled?
2. Network stable?
3. Browser console errors?

**Solution:**
```bash
# Restart backend
python api_server.py
```

### Build errors

**Check:**
1. All dependencies installed? `npm install`
2. Node version 16+?
3. No TypeScript errors?

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Stream not showing

**Check:**
1. Backend streaming? `http://localhost:5001/api/stream/video`
2. CORS headers correct?
3. Browser console errors?

**Solution:**
```jsx
// Check streamUrl in CCTVFeed component
console.log(getStreamUrl())
```

## 📚 Dependencies

### Production
- `react` - UI framework
- `react-dom` - DOM rendering
- `socket.io-client` - WebSocket client
- `axios` - HTTP client
- `lucide-react` - Icons

### Development
- `vite` - Build tool
- `tailwindcss` - CSS framework
- `@vitejs/plugin-react` - React support
- `eslint` - Linting
- `postcss` - CSS processing

## 🚀 Performance

### Optimization Tips

1. **Lazy Loading:**
   - Components lazy loaded with React.lazy()
   - Route-based code splitting

2. **Image Optimization:**
   - MJPEG stream optimized di backend
   - Frame skip untuk reduce bandwidth

3. **State Management:**
   - WebSocket events throttled
   - Activity logs limited to 50 items

4. **Build Optimization:**
   - Vite automatic code splitting
   - Tree shaking unused code
   - CSS minification

## 📖 Documentation

- [Main Integration Guide](../INTEGRATION_GUIDE.md)
- [Quick Start](../QUICK_START.md)
- [Backend API Docs](../api_server.py)
- [Streaming Optimization](../OPTIMASI_STREAMING.md)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit PR

## 📄 License

Proprietary - Internal use only

---

**Built with ❤️ using React + Vite + Tailwind CSS**
