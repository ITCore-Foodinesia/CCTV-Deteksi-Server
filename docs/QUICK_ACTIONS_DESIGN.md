# Quick Actions Design - Warehouse AI Dashboard

## 📦 Desain Full Quick Actions Panel

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   ⚡ Quick Actions                                    │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │   ┌─────────────────────────────────────────────────┐ │  │
│  │   │  📹                                             │ │  │
│  │   │  Add Camera                                     │ │  │
│  │   │  ─────────────────────────────────────          │ │  │
│  │   │  Register new CCTV camera to monitoring         │ │  │
│  │   │                                                 │ │  │
│  │   │                              [+ Add Camera]     │ │  │
│  │   └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │   │     👤       │ │     👥       │ │     🔧       │  │  │
│  │   │              │ │              │ │              │  │  │
│  │   │ Add Driver   │ │ Add Helper   │ │ Add Loader   │  │  │
│  │   │              │ │              │ │              │  │  │
│  │   └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Design Detail

### Option A: Vertical List Style

```
┌────────────────────────────────────────┐
│  ⚡ Quick Actions                      │
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 📹  Add Camera                 │    │   ← Blue bg (#3b82f6)
│  │     Setup new CCTV feed        │    │     White text
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 👤  Add Driver                 │    │   ← Green bg (#22c55e)
│  │     Register truck driver      │    │     White text
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 👥  Add Helper                 │    │   ← Emerald bg (#10b981)
│  │     Register loading helper    │    │     White text
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 🔧  Add Loader                 │    │   ← Teal bg (#14b8a6)
│  │     Register forklift/loader   │    │     White text
│  └────────────────────────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

---

### Option B: Grid Style (Compact)

```
┌────────────────────────────────────────┐
│  ⚡ Quick Actions                      │
├────────────────────────────────────────┤
│                                        │
│  ┌─────────────┐    ┌─────────────┐    │
│  │     📹      │    │     👤      │    │
│  │             │    │             │    │
│  │ Add Camera  │    │ Add Driver  │    │
│  │   (Blue)    │    │  (Green)    │    │
│  └─────────────┘    └─────────────┘    │
│                                        │
│  ┌─────────────┐    ┌─────────────┐    │
│  │     👥      │    │     🔧      │    │
│  │             │    │             │    │
│  │ Add Helper  │    │ Add Loader  │    │
│  │ (Emerald)   │    │  (Teal)     │    │
│  └─────────────┘    └─────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

---

### Option C: Icon Row + Dropdown (Most Compact)

```
┌────────────────────────────────────────┐
│  ⚡ Quick Actions                      │
├────────────────────────────────────────┤
│                                        │
│   [📹 Camera]   [👤 Personnel ▼]       │
│                                        │
│     ┌─────────────────────┐            │
│     │ 👤 Add Driver       │            │
│     │ 👥 Add Helper       │            │
│     │ 🔧 Add Loader       │            │
│     └─────────────────────┘            │
│                                        │
└────────────────────────────────────────┘
```

---

## 📐 Detailed Component Specs

### Individual Action Card

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │                                                  │   │
│   │    ┌────┐                                        │   │
│   │    │ 📹 │   Add Camera                          │   │
│   │    │    │                                        │   │
│   │    └────┘   Connect a new CCTV camera           │   │
│   │             to the monitoring system             │   │
│   │                                                  │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
│   Specs:                                                 │
│   ─────────────────────────────────────────────         │
│   • Border Radius: 12px (rounded-xl)                    │
│   • Padding: 16px                                        │
│   • Icon Size: 24px                                      │
│   • Title: 14px, font-semibold                          │
│   • Subtitle: 12px, text-gray-500                       │
│   • Hover: scale(1.02), shadow-md                       │
│   • Focus Ring: 2px lime-500                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Palette

| Action | Background | Text | Icon BG | Hover |
|--------|------------|------|---------|-------|
| Add Camera | `bg-blue-500` | White | `bg-blue-600` | `bg-blue-600` |
| Add Driver | `bg-green-500` | White | `bg-green-600` | `bg-green-600` |
| Add Helper | `bg-emerald-500` | White | `bg-emerald-600` | `bg-emerald-600` |
| Add Loader | `bg-teal-500` | White | `bg-teal-600` | `bg-teal-600` |

---

## 📝 States

### Default State
```
┌────────────────────────────┐
│ 📹  Add Camera             │  ← Normal bg, no shadow
│     Connect new CCTV       │
└────────────────────────────┘
```

### Hover State
```
┌────────────────────────────┐
│ 📹  Add Camera             │  ← Darker bg, shadow-md
│     Connect new CCTV       │    scale: 1.02
└────────────────────────────┘
      ↑
      shadow
```

### Focus State (Keyboard)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📹  Add Camera             ┃  ← 2px lime-500 ring
┃     Connect new CCTV       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Disabled State (optional)
```
┌────────────────────────────┐
│ 📹  Add Camera             │  ← opacity: 0.5
│     Connect new CCTV       │    cursor: not-allowed
└────────────────────────────┘
```

---

## 🖥️ Responsive Behavior

### Desktop (1280px+)
```
[📹 Camera] [👤 Driver] [👥 Helper] [🔧 Loader]
    ↓           ↓           ↓           ↓
   Full      Full        Full        Full
```

### Tablet (768px - 1279px)
```
[📹 Camera] [👤 Driver]
[👥 Helper] [🔧 Loader]
    ↓
  2x2 Grid
```

### Mobile (< 768px)
```
[📹 Camera    ]
[👤 Driver    ]
[👥 Helper    ]
[🔧 Loader    ]
    ↓
  Stacked
```

---

## 🔗 Modal Flow (When Clicked)

```
User clicks "Add Camera"
         │
         ▼
┌───────────────────────────────────────────┐
│                                     [X]   │
│   ➕ Add New Camera                       │
│   ────────────────────────────────────    │
│                                           │
│   Camera Name *                           │
│   ┌─────────────────────────────────┐    │
│   │ Dock Camera 01                  │    │
│   └─────────────────────────────────┘    │
│                                           │
│   Stream URL *                            │
│   ┌─────────────────────────────────┐    │
│   │ rtsp://192.168.1.100:554/stream │    │
│   └─────────────────────────────────┘    │
│                                           │
│   Assign to Dock                          │
│   ┌─────────────────────────────────┐    │
│   │ Select dock...              ▼   │    │
│   └─────────────────────────────────┘    │
│                                           │
│   ☐ Enable AI Detection                  │
│                                           │
│   ┌─────────┐  ┌──────────────────┐      │
│   │ Cancel  │  │   Save Camera    │      │
│   └─────────┘  └──────────────────┘      │
│                                           │
└───────────────────────────────────────────┘
```

---

## ✅ Recommended Implementation

Berdasarkan analisis, **Option A (Vertical List Style)** paling cocok karena:
1. Lebih jelas - setiap action punya deskripsi
2. Lebih accessible - touch target lebih besar
3. Konsisten dengan Quick Actions di dashboard existing
4. Mudah di-extend jika ada action baru

```jsx
// Quick Action Button Component
const QuickActionButton = ({ icon, label, description, color, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-4 rounded-xl text-white 
                transition-all hover:scale-[1.02] hover:shadow-md
                focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500
                ${color}`}
  >
    <span className="text-2xl">{icon}</span>
    <div className="text-left">
      <div className="font-semibold">{label}</div>
      <div className="text-xs opacity-80">{description}</div>
    </div>
  </button>
);
```
