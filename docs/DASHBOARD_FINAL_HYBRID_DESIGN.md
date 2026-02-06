# Final Recommended Layout: "The Hybrid Operator"

> **Concept**: A balanced interface that merges high-level metrics with rich visual context from the CCTV system.
> **Philosophy**: "Data tells you *what* is happening; CCTV shows you *why*."

---

## 1. 🖼️ The Wireframe Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOP BAR:  🔍 Search...    🔔 Alerts    👤 User Profile                 │
└─────────────────────────────────────────────────────────────────────────┘
  
  ┌─ 📊 KEY METRICS RIBBON ────────────────────────────────────────────┐
  │                                                                    │
  │  [🔥 Active Sessions]   [🏢 Avail Docks]   [👮 Active Drivers]   [✅ Today Completed]
  │        12                   3 / 8                 15                    42
  │      (+2 vs 1hr)           (Low)               Online                 98% Rate
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘

  ┌── LEFT: SMART DOCK GRID (65%) ─────────┐  ┌── RIGHT: ACTIONS (35%) ──┐
  │                                        │  │                          │
  │  ┌──────────────────┐  ┌────────────┐  │  │  ⚡ QUICK ACTIONS        │
  │  │ DOCK 01  [LOAD]  │  │ DOCK 02    │  │  │  ┌──────┐  ┌──────┐    │
  │  │ ┌──────────────┐ │  │ ┌────────┐ │  │  │  │ ➕   │  │ ⚠️   │    │
  │  │ │  [CCTV IMG]  │ │  │ │ [IMG]  │ │  │  │  │ Add  │  │Report│    │
  │  │ │ 🚛 TRUCK A   │ │  │ │ EMPTY  │ │  │  │  │ Truck│  │Issue │    │
  │  │ └──────────────┘ │  │ └────────┘ │  │  │  └──────┘  └──────┘    │
  │  │ 👤 Budi Santoso  │  │ ✅ Avail   │  │  │                          │
  │  └──────────────────┘  └────────────┘  │  │  📢 LIVE ALERTS          │
  │                                        │  │  ┌────────────────────┐  │
  │  ┌──────────────────┐  ┌────────────┐  │  │  │ ⚠️ Unauth Person   │  │
  │  │ DOCK 03  [MAINT] │  │ DOCK 04    │  │  │  │ Dock 3 - 2m ago    │  │
  │  │ ┌──────────────┐ │  │ ...        │  │  │  └────────────────────┘  │
  │  │ │  [CCTV IMG]  │ │  │            │  │  │                          │
  │  │ │ 🔧 WORKER    │ │  │            │  │  │  ℹ️ Loading Complete     │
  │  │ └──────────────┘ │  │            │  │  │     Dock 1 - 5m ago      │
  │  │ ⚠️ Repairing     │  │            │  │  │                          │
  │  └──────────────────┘  └────────────┘  │  └──────────────────────────┘
  │                                        │                          
  └────────────────────────────────────────┘
```

---

## 2. 🧱 Key Components Breakdown

### A. The "Smart Stats" Ribbon (Top)
Matches your request for specific data points.
*   **Active Session**: Shows total ongoing operations. *Green if efficient, Red if overloaded.*
*   **Avail Docks**: Critical for assignment. *Shows "X/Y" available.*
*   **Active Drivers**: Who is on site right now.
*   **Today Completed**: Your daily throughput goal.

### B. The "Smart Dock Card" (The Star of the Show)
This replaces the boring list. It is a "Visual Widget".

*   **Header**: Dock Name + Color-coded Badge (Green/Orange/Red).
*   **Visual Core**:
    *   **CCTV Thumbnail**: Updates every 5-10 seconds.
    *   **Overlay**: If detection confidence is high, draw a bounding box (e.g., "Truck 98%").
    *   **Click Action**: Opens a modal with the **Live Stream**.
*   **Footer**:
    *   **Metadata**: Truck Plate Number + Driver Name.
    *   **Timer**: "Loading for 45m" (Turns red if over SLA).

### C. The Right Sidebar (Action Center)
Keeps the controls always accessible without cluttering the main view.

*   **Quick Actions Grid**: Large, touch-friendly buttons for common tasks.
    *   *Add Incoming Truck*
    *   *Emergency Stop*
    *   *Broadcast Announcement*
*   **Live Feed**: A timeline of what just happened, so you don't have to watch every camera 24/7.

---

## 3. Why This "Hybrid" Layout is Best for You?

1.  **It answers "Where is my data?"**: The top ribbon gives you the 4 key numbers you asked for immediately.
2.  **It uses your CCTV asset**: Instead of hiding the cameras in a separate page, they are *integrated* into the dock status cards. You verify the data with your own eyes instantly.
3.  **It's Actionable**: The Right Sidebar ensures you can react (e.g., "Report Issue") without leaving the monitoring screen.

---

## 4. Implementation Details (Frontend)

*   **Grid System**: Use CSS Grid `grid-cols-12`.
    *   Left Panel: `col-span-8` (or `col-span-9` on large screens).
    *   Right Panel: `col-span-4` (or `col-span-3`).
*   **Responsiveness**:
    *   **Mobile**: Stack everything. Ribbon becomes a 2x2 grid. Docks become a list.
    *   **Tablet**: Sidebar collapses to icons.
*   **Theme**: Use **White Cards on Light Gray Background** for high contrast, but keep the CCTV thumbnails un-dimmed.

This layout is the "Goldilocks" solution—not too dense (Manager view), not too sparse (Security view). It's exactly right for an **AI-Powered Warehouse Dashboard**.
