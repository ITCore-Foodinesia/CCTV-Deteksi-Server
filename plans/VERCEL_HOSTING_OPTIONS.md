# Vercel Hosting Options for CCTV Dashboard

## Executive Summary

**Question**: Can the dashboard be hosted on Vercel without using the local PC server?

**Answer**: The **React frontend** can be hosted on Vercel, but the **backend** (live CCTV stream, YOLO detection, WebSocket) **cannot** run on Vercel due to:

- Vercel's serverless nature (10-60 second timeout)
- No persistent connections for MJPEG streaming
- No GPU access for YOLO detection
- Limited WebSocket support

---

## Current Architecture Dependencies

```
Dashboard (React/Vite) ──────────────────────────────────────────┐
    │                                                            │
    ├── WebSocket (Socket.IO) ──▶ Real-time stats, activities   │
    ├── REST API (/api/*) ──────▶ Status, settings, sheets      │
    └── MJPEG Stream ───────────▶ Live CCTV video feed          │
                                                                 │
                        Unified Server (Python/Flask)            │
                        Port 5001                                │
                        ┌────────────────────────────────────────┘
                        │
                        ├── Camera capture (RTSP)
                        ├── YOLO detection (GPU/TensorRT)
                        ├── Google Sheets integration
                        └── Telegram integration
```

---

## Option 1: 🏆 RECOMMENDED — Frontend Vercel + Backend PC (Cloudflare Tunnel)

### Architecture

```
┌──────────────────────┐                    ┌─────────────────────────────┐
│  Vercel              │                    │  Your PC (Always Running)   │
│  dashboard.vercel.app│                    │                             │
│                      │     HTTPS          │  ┌─────────────────────┐    │
│  ┌────────────────┐  │◀───────────────────│  │ Cloudflare Tunnel   │    │
│  │ React Dashboard│  │                    │  │ api.yourdomain.com  │    │
│  │ (Static Files) │  │                    │  └──────────┬──────────┘    │
│  └────────────────┘  │                    │             │               │
│                      │                    │  ┌──────────▼──────────┐    │
└──────────────────────┘                    │  │ Unified Server      │    │
                                            │  │ Port 5001           │    │
                                            │  │ - MJPEG Stream      │    │
                                            │  │ - WebSocket         │    │
                                            │  │ - REST API          │    │
                                            │  │ - YOLO Detection    │    │
                                            │  └─────────────────────┘    │
                                            └─────────────────────────────┘
```

### Implementation Steps

#### Step 1: Prepare Dashboard for Vercel

```bash
# In dashboard/ folder
npm run build   # Creates dist/ folder
```

#### Step 2: Configure Environment Variables

Create production environment in Vercel dashboard:

| Variable        | Value                        |
| --------------- | ---------------------------- |
| `VITE_API_URL`  | `https://api.yourdomain.com` |
| `VITE_EDGE_URL` | `https://api.yourdomain.com` |

#### Step 3: Deploy to Vercel

**Option A: Vercel CLI**

```bash
cd dashboard
npm i -g vercel
vercel login
vercel --prod
```

**Option B: Connect GitHub Repo**

1. Push `dashboard/` to GitHub
2. Connect repo in Vercel dashboard
3. Set root directory: `dashboard`
4. Build command: `npm run build`
5. Output directory: `dist`

#### Step 4: Configure vercel.json

Create `dashboard/vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

#### Step 5: Setup Cloudflare Tunnel (Already Existing)

Ensure your PC runs:

```bash
cloudflared tunnel run icetube-api
```

With config pointing to `localhost:5001`.

### Pros

- ✅ Full functionality preserved
- ✅ Dashboard always available (Vercel CDN)
- ✅ Fast global access to static assets
- ✅ Backend stays on your network (camera access)
- ✅ Free tier sufficient

### Cons

- ❌ PC must be running for live features
- ❌ If PC offline → no stream/real-time data

### Estimated Effort

- **Time**: 30 minutes - 1 hour
- **Difficulty**: Easy

---

## Option 2: Standalone/Demo Mode — 100% Vercel

### Concept

Create a demo version with:

- Mock/static data
- Pre-recorded video loop or placeholder image
- Simulated activity feed

### Architecture

```
┌──────────────────────────────────────────┐
│  Vercel (100% Serverless)                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ React Dashboard (Static)           │  │
│  │                                    │  │
│  │ - Mock WebSocket → setInterval     │  │
│  │ - Mock API → hardcoded JSON        │  │
│  │ - Mock Video → placeholder/loop    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Vercel Edge Functions (Optional)   │  │
│  │ - /api/status → mock response      │  │
│  │ - /api/stats → static/random data  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Create Standalone Mode Toggle

Update `dashboard/.env`:

```env
VITE_DEMO_MODE=true
VITE_API_URL=  # Leave empty for demo mode
```

#### Step 2: Modify useWebSocket Hook

Create `dashboard/src/hooks/useWebSocketDemo.js`:

```javascript
import { useEffect, useState, useCallback } from "react";

// Demo mode - simulates real-time data without backend
export const useWebSocketDemo = () => {
  const [connected, setConnected] = useState(true); // Always "connected" in demo
  const [stats, setStats] = useState({
    inbound: 12,
    outbound: 8,
    trucks: 3,
    capacity: 84,
    fps: 30,
    latency: 45,
  });
  const [activities, setActivities] = useState([
    {
      id: 1,
      type: "inbound",
      plate: "B 1234 ABC",
      driver: "John",
      time: "08:00",
    },
    {
      id: 2,
      type: "outbound",
      plate: "B 5678 DEF",
      driver: "Jane",
      time: "08:15",
    },
    // ... more mock data
  ]);
  const [status, setStatus] = useState("Demo Mode");
  const [sheetsData, setSheetsData] = useState({
    latest_plate: "B 9999 XYZ",
    latest_driver: "Demo Driver",
    latest_items: "Demo Items",
    loading_count: 5,
    rehab_count: 2,
  });

  // Simulate updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        inbound: prev.inbound + Math.floor(Math.random() * 2),
        outbound: prev.outbound + Math.floor(Math.random() * 2),
        fps: 25 + Math.floor(Math.random() * 10),
        latency: 30 + Math.floor(Math.random() * 20),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    connected,
    stats,
    activities,
    status,
    sheetsData,
    requestStats: useCallback(() => {}, []),
    requestActivities: useCallback(() => {}, []),
  };
};
```

#### Step 3: Create Mode Selector

Update main hook export:

```javascript
// dashboard/src/hooks/useWebSocket.js
import { useWebSocket as useWebSocketReal } from "./useWebSocketReal";
import { useWebSocketDemo } from "./useWebSocketDemo";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const useWebSocket = DEMO_MODE ? useWebSocketDemo : useWebSocketReal;
```

#### Step 4: Mock CCTV Feed

Update CCTVFeed for demo mode:

```javascript
// In CCTVFeed.jsx
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// Replace stream with placeholder
const streamUrl = DEMO_MODE
  ? "/demo-cctv-placeholder.jpg" // Static image in public/
  : getStreamUrl();
```

#### Step 5: Deploy to Vercel

Same as Option 1, but with `VITE_DEMO_MODE=true`.

### Pros

- ✅ 100% serverless, always available
- ✅ No PC needed
- ✅ Good for demos/presentations
- ✅ Free forever

### Cons

- ❌ No real data
- ❌ No live CCTV stream
- ❌ Not suitable for production monitoring

### Estimated Effort

- **Time**: 2-4 hours
- **Difficulty**: Medium

---

## Option 3: Hybrid Cloud — Vercel + Cloud VM

### Concept

Move backend to a cloud VM that runs 24/7.

### Challenge

**Critical Issue**: Your CCTV camera is on your local network. A cloud VM cannot access `rtsp://192.168.x.x:554/...`

### Solutions for Camera Access

| Solution                   | How It Works                                  | Cost                |
| -------------------------- | --------------------------------------------- | ------------------- |
| **Camera with Cloud RTSP** | Some IP cameras offer cloud streaming         | Varies              |
| **RTSP to Cloud Bridge**   | Run a small service on PC to forward to cloud | PC must run         |
| **VPN Tunnel**             | Create VPN between cloud and home network     | Complex setup       |
| **Tailscale/ZeroTier**     | Mesh VPN, cloud VM joins your network         | Free tier available |

### Architecture (with Tailscale)

```
┌─────────────────────┐     ┌─────────────────────────────────────────┐
│ Vercel              │     │ Cloud VM (Railway/Fly.io/VPS)           │
│ dashboard.vercel.app│     │                                         │
│                     │────▶│ ┌─────────────────────────────────────┐ │
│ React Dashboard     │     │ │ Unified Server                      │ │
└─────────────────────┘     │ │ - MJPEG Stream (from camera)        │ │
                            │ │ - WebSocket                         │ │
                            │ │ - REST API                          │ │
                            │ │ - Note: NO YOLO (no GPU on cheap VM)│ │
                            │ └───────────────┬─────────────────────┘ │
                            │                 │ Tailscale VPN         │
                            └─────────────────┼───────────────────────┘
                                              │
                            ┌─────────────────▼───────────────────────┐
                            │ Your Home Network (via Tailscale)       │
                            │                                         │
                            │ ┌─────────────────────────────────────┐ │
                            │ │ IP Camera                           │ │
                            │ │ rtsp://100.x.x.x:554/stream         │ │
                            │ │ (Tailscale IP, accessible from VM)  │ │
                            │ └─────────────────────────────────────┘ │
                            └─────────────────────────────────────────┘
```

### Estimated Costs

| Service      | Price                             |
| ------------ | --------------------------------- |
| Railway      | $5/month (Hobby) or usage-based   |
| Fly.io       | $0-5/month (free tier + small VM) |
| DigitalOcean | $4-6/month (basic droplet)        |
| Tailscale    | Free (personal use)               |

### Pros

- ✅ Dashboard always available
- ✅ Backend always running
- ✅ No need to keep PC on

### Cons

- ❌ Complex setup (Tailscale + cloud VM)
- ❌ Monthly cost
- ❌ No YOLO detection (no GPU on cheap VMs)
- ❌ Latency increase (home → cloud → user)

### Estimated Effort

- **Time**: 1-2 days
- **Difficulty**: Hard

---

## Recommendation Summary

| Scenario                         | Best Option                |
| -------------------------------- | -------------------------- |
| **PC always on anyway**          | Option 1 (Vercel + Tunnel) |
| **Need demo/presentation**       | Option 2 (Demo Mode)       |
| **Want fully serverless**        | Option 2 (Demo Mode)       |
| **Have budget + want always-on** | Option 3 (Cloud VM)        |
| **Camera has cloud RTSP**        | Option 3 (Cloud VM)        |

---

## Quick Start: Option 1 (Recommended)

### Files to Create/Modify

1. **`dashboard/vercel.json`** — Vercel config
2. **Update `.env`** — Production API URL
3. **No code changes needed!**

### Commands

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Navigate to dashboard
cd dashboard

# 3. Login
vercel login

# 4. Deploy
vercel --prod

# 5. Set environment variables in Vercel dashboard
#    VITE_API_URL = https://api.yourdomain.com
#    VITE_EDGE_URL = https://api.yourdomain.com
```

### Checklist

- [ ] Cloudflare Tunnel running on PC
- [ ] Unified Server running on PC (port 5001)
- [ ] Dashboard deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] CORS configured on backend (already done if using Cloudflare)

---

## Rollback Plan

If Vercel deployment has issues:

1. Dashboard is still running locally (`npm run dev`)
2. Can revert to local hosting anytime
3. No data/backend impact

---

## Validation Steps

After deployment:

1. **Check static assets load**: Open dashboard URL → should see UI
2. **Check API connection**: Open browser DevTools → Network tab → verify API calls to `api.yourdomain.com`
3. **Check WebSocket**: Should show "Connected" status
4. **Check video stream**: CCTV feed should load
5. **Check console**: No CORS or connection errors
