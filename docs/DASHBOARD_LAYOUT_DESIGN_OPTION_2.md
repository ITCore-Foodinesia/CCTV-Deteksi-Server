# Dashboard Layout Design Specification (Option 2)

> **Concept Name**: "The Watchtower" (Visual-First Monitoring)  
> **Document Version**: 1.0  
> **Target Audience**: Security Officers & Floor Managers  
> **Philosophy**: Minimize reading, maximize *seeing*.

---

## 📋 Executive Summary

While Option 1 focused on **Operational Management** (Command Center), Option 2 focuses on **Real-time Surveillance & AI Verification** (Digital Twin).

This layout is optimized for screens that stay open all day (Wallboards or 2nd Monitors). It shifts the focus from *retrospective metrics* to *live situational awareness*.

### Comparison
| Feature | Option 1 (Management) | Option 2 (The Watchtower) |
| :--- | :--- | :--- |
| **Primary Focus** | KPIs & Efficiency Stats | Live Feeds & Status |
| **Layout Style** | Grid of Cards | Spatial / Canvas |
| **Interaction** | Click to drill-down | Passive monitoring + Quick resolve |
| **Density** | High (Data heavy) | Medium (Visual heavy) |
| **Best For** | Warehouse Manager | Security / Dispatcher |

---

## 🏗️ "The Watchtower" Layout Structure

This layout introduces a **3-Panel Interface**:

1.  **Navigation Rail** (Collapsed Sidebar)
2.  **Visual Operations Canvas** (Main View - 70%)
3.  **Intel Sidebar** (Right Panel - 30%)

```
┌────┬──────────────────────────────────────────┬──────────────────────┐
│    │  TOP BAR:  🟢 System Online  |  🕒 14:30  |  🌡️ 28°C            │
│ N  ├──────────────────────────────────────────┼──────────────────────┤
│ A  │                                          │                      │
│ V  │  ┌────────────────────────────────────┐  │  🚨 ALERTS (Priority)│
│    │  │                                    │  │  ┌────────────────┐  │
│ R  │  │   LIVE DOCK MAP / CCTV GRID        │  │  │ ⚠️ Unauth     │  │
│ A  │  │   (Visual Representation)          │  │  │    Person      │  │
│ I  │  │                                    │  │  └────────────────┘  │
│ L  │  │   [Dock 1]  [Dock 2]  [Dock 3]     │  │                      │
│    │  │   🎥 LIVE   🎥 LIVE   ⚫ OFF       │  │  📋 LIVE FEED        │
│    │  │                                    │  │  ┌────────────────┐  │
│    │  │                                    │  │  │ 🚛 Inbound    │  │
│    │  └────────────────────────────────────┘  │  │    B 1234 XX   │  │
│    │                                          │  │    14:28       │  │
│    │  ┌────────────────────────────────────┐  │  ├────────────────┤  │
│    │  │   TIMELINE / SHIFT PROGRESS        │  │  │ ✅ Loading    │  │
│    │  │   [====>...........] 35%           │  │  │    Complete    │  │
│    │  └────────────────────────────────────┘  │  └────────────────┘  │
│    │                                          │                      │
└────┴──────────────────────────────────────────┴──────────────────────┘
```

---

## 🎯 Key Design Features

### 1. The "Live Canvas" (Main Area)

Instead of a list of dock cards, this uses a **Spatial Grid**.

**Problem with Lists**: You have to read "Dock 1" then check status.  
**Solution**: A visual grid where the *state* is the container.

**Visual Layout**:
*   **CCTV Snapshot Mode**: Each dock card shows the *latest* AI-analyzed frame (updated every 5s) instead of just an icon.
*   **Overlay Status**: Status badges overlay the image.

```jsx
// Concept Code
<div className="grid grid-cols-3 gap-4 h-full">
  <DockVisualCard 
    image="/cctv/dock1-thumb.jpg" 
    status="loading" 
    occupancy="85%" 
    aiConfidence={0.98} 
  />
  {/* ... */}
</div>
```

### 2. The "Intel Sidebar" (Right Panel)

Dedicate the right 300-350px permanently to **Stream of Events**.
This separates *Static State* (Left) from *Dynamic Events* (Right).

*   **Top Section: AI Alerts** (Must Acknowledge)
    *   Red/Orange cards that stay until clicked.
    *   Example: "Unknown License Plate", "Safety Violation".
*   **Bottom Section: Activity Stream**
    *   Auto-scrolling log of standard operations.

### 3. Navigation Rail (Slim Sidebar)

To maximize video/visual space, the sidebar shrinks to a **Navigation Rail** (Icons only, 64px width).
*   Hover to expand.
*   Keeps the interface clean and immersive.

### 4. "Heads-Up" Display (HUD) Top Bar

Remove the white heavy header. Replace with a **transparent or dark glass HUD**.
*   Background: `bg-slate-900/90` or `backdrop-blur-md`.
*   Content: Global Health Metrics only.
    *   "System Status: Healthy"
    *   "Active Cameras: 12/12"
    *   "Network Latency: 24ms"

---

## 📐 Component Specifications

### Visual Dock Card (The Core Component)

```
┌────────────────────────────────────────┐
│  [ LIVE ]  Dock 01           🕒 12m    │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │        CCTV THUMBNAIL            │  │
│  │        (Updates 5s)              │  │
│  │                                  │  │
│  │   [=====] Progress 60%           │  │
│  └──────────────────────────────────┘  │
│  🚛 B 1234 XY  •  👤 Driver Name       │
└────────────────────────────────────────┘
```
*   **Aspect Ratio**: 16:9 (Matches camera feed).
*   **Interactivity**: Click opens full modal with live stream & controls.

### Smart Alert Card

```
┌──────────────────────────────┐
│ ⚠️ SAFETY VIOLATION          │
│ Detected: Person in forklift │
│ zone.                        │
│ [View Clip] [Dismiss]        │
└──────────────────────────────┘
```
*   **Color**: `bg-red-50` border-l-4 `border-red-500`.
*   **Action**: Requires user interaction to clear.

---

## 🎨 Aesthetic Theme: "Dark Mode Industrial"

For Option 2, I recommend a **Dark Mode** default.
*   **Why?** Reduces eye strain for monitoring screens. Colors (Red/Green alerts) pop more against dark backgrounds.
*   **Palette**:
    *   Background: `bg-slate-900`
    *   Cards: `bg-slate-800`
    *   Text: `text-slate-100`
    *   Accents: Neon Lime (`#84cc16`) and Alert Red (`#ef4444`).

---

## 📱 Responsive Adaptation

**Tablet**:
*   Right Sidebar moves to a "Slide-over" drawer.
*   Main Canvas becomes 2 columns.

**Mobile**:
*   **Stack View**:
    1.  Global Status (HUD).
    2.  Alerts Carousel (Swipe horizontal).
    3.  Dock List (Condensed rows, not visual cards).
    4.  Nav Bar moves to **Bottom Navigation**.

---

## 🚀 Implementation Roadmap (Option 2)

If choosing this route:

1.  **Switch to Dark Theme**: Update `tailwind.config.js` and `theme.js`.
2.  **Build NavRail**: Modify `Sidebar.jsx` to support "collapsed" prop.
3.  **Create RightSidebar**: New layout component for the Intel feed.
4.  **Develop DockVisualCard**: Needs integration with CCTV thumbnail API (or placeholder for now).

---

## ⚖️ Recommendation Summary

*   **Choose Option 1** if your users are **Managers** analyzing efficiency and reports.
*   **Choose Option 2** if your users are **Operators/Security** watching the floor in real-time.

For `cctv-deteksi`, **Option 2** aligns closer with the "AI/Computer Vision" nature of the project.
