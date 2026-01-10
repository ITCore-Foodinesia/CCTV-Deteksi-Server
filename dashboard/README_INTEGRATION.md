# 🎯 Integrated Dashboard with Engine

## ✅ What's Changed

Dashboard telah diintegrasikan dengan **CCTV Detection Engine** dan disesuaikan untuk bekerja dengan API engine.

### **API Adaptations**

| Old API (Port 5001) | Engine API (Port 8080) |
|---|---|
| `/api/stream/video` | `/stream/{camera_id}` |
| `/api/status` | `/api/health` |
| `/api/stats` | `/api/cameras/{id}/stats` |
| `/api/activities` | Built from WebSocket events |

### **WebSocket Events**

Dashboard now listens to engine events:
- `detection` - Object detection events
- `count_update` - Counting zone updates  
- `status` - Camera status changes

---

## 🚀 Quick Start

### 1. **Install Dependencies**

```bash
cd dashboard
npm install
```

### 2. **Start Engine** (Terminal 1)

```bash
cd ../
python run_demo.py
```

Engine will run on `http://localhost:8080`

### 3. **Start Dashboard** (Terminal 2)

```bash
cd dashboard
npm run dev
```

Dashboard will open on `http://localhost:5173`

---

## 📊 How It Works

### **Data Flow**

```
┌─────────────────┐
│   Webcam/RTSP   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Engine (8080)  │◄──── REST API ────┐
│                 │                    │
│  - Detection    │                    │
│  - Counting     │                    │
│  - Streaming    │                    │
└────────┬────────┘                    │
         │                             │
         │ WebSocket Events            │
         │ - detection                 │
         │ - count_update              │
         │ - status                    │
         │                             │
         ▼                             │
┌─────────────────┐                    │
│ Dashboard (5173)│────────────────────┘
│                 │
│  - Video Player │
│  - Stats Cards  │
│  - Activity Log │
└─────────────────┘
```

###**Key Files Modified**

1. **`src/services/api.js`**
   - Changed API base URL to `http://localhost:8080`
   - Mapped old endpoints to engine endpoints
   - Added camera ID parameter support

2. **`src/hooks/useWebSocket.js`**
   - Changed Socket.IO URL to `http://localhost:8080`
   - Added camera subscription (`subscribe`/`unsubscribe`)
   - Handle  engine events (`detection`, `count_update`, `status`)
   - Build activities from real-time events

3. **`.env`**
   - Set `VITE_API_URL=http://localhost:8080`

---

## 🎥 Features

### **Live Video Stream**
- Real-time MJPEG stream from engine
- Detection overlay with bounding boxes
- Fullscreen support

### **Real-time Statistics**
- Inbound/Outbound counts from counting zones
- FPS monitoring
- Detection events counter

### **Activity Log**
- Real-time event notifications
- Detection events
- Count updates
- Status changes

### **WebSocket Integration**
- Auto-connect to engine
- Auto-subscribe to camera
- Real-time event streaming
- Reconnection handling

---

## 🔧 Configuration

### **Change Camera ID**

If using different camera ID, edit files:

**`src/hooks/useWebSocket.js`:**
```javascript
export const useWebSocket = (cameraId = 'your_camera_id') => {
```

**`src/services/api.js`:**
```javascript
export const getStreamUrl = (cameraId = 'your_camera_id') => ...
```

### **Remote Access**

To access from other devices:

1. **Get PC IP:**
   ```bash
   ipconfig
   ```

2. **Update `.env`:**
   ```env
   VITE_API_URL=http://192.168.1.100:8080
   ```

3. **Rebuild:**
   ```bash
   npm run build
   npm run preview
   ```

4. **Access:**
   - Dashboard: `http://192.168.1.100:4173` (preview)
   - Engine: `http://192.168.1.100:8080`

---

## 🐛 Troubleshooting

### **Dashboard can't connect to engine**

**Check:**
1. Engine running? → `python run_demo.py`
2. Correct port? → Engine runs on 8080
3. CORS allowed? → Engine has CORS enabled

**Fix:**
```bash
# Restart engine
cd ..
python run_demo.py
```

### **Video stream not showing**

**Check:**
1. Camera ID correct? → Default is `demo_cam`
2. Stream URL correct? → Check browser console
3. Camera running in engine?

**Fix:**
```javascript
// Check in browser console (F12)
console.log('Stream URL:', getStreamUrl());
// Should be http://localhost:8080/stream/demo_cam
```

### **WebSocket not connecting**

**Check:**
1. Engine WebSocket enabled? → Check engine config
2. Port 8080 accessible?
3. Browser console errors?

**Fix:**
```bash
# In browser console
# Should see: "✓ WebSocket connected to engine"
# Should see: "Subscribed to camera: demo_cam"
```

### **No detection events**

**Check:**
1. Camera detecting objects?
2. Objects crossing counting zone?
3. WebSocket subscribed to correct camera?

**Fix:**
- Point camera at yourself
- Move across counting line
- Check browser console for `detection` events

---

## 📁 Project Structure

```
test-engine/
├── dashboard/              # React dashboard (this folder)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CCTVFeed.jsx          # Video player
│   │   │   ├── StatsCard.jsx         # Metric cards
│   │   │   ├── ActivityLog.jsx       # Event log
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── useWebSocket.js       # ✅ Modified for engine
│   │   ├── services/
│   │   │   └── api.js                # ✅ Modified for engine
│   │   └── ...
│   ├── .env                           # ✅ Modified (port 8080)
│   └── package.json
│
├── engine/                 # Engine core
├── demo_config.json        # Engine config
├── run_demo.py             # Engine runner
└── README_DEMO.md          # Engine guide
```

---

## 📚 Next Steps

1. **Customize Counting Zones**
   - Edit `demo_config.json`
   - Adjust `counting.zones` coordinates

2. **Add More Cameras**
   - Add camera to `demo_config.json`
   - Update dashboard to handle multiple cameras

3. **Deploy to Production**
   ```bash
   # Build dashboard
   cd dashboard
   npm run build
   
   # Serve with engine
   # Files will be in dist/
   ```

---

## 💡 Tips

- **Better Performance**: Use GPU by setting `"device": "0"` in config
- **Lower Latency**: Set `"frame_skip": 1` in config
- **More Detections**: Lower `"confidence": 0.25` in config
- **Better Quality**: Increase streaming `"quality": 85` in config

---

**Ready to use! 🎉**

Run both engine and dashboard, then visit http://localhost:5173
