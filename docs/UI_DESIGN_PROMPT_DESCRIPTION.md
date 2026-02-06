# 📋 Deskripsi Aplikasi untuk UI Design Prompt

## 🎯 Ringkasan Singkat

**Warehouse AI Dashboard** adalah sistem monitoring dan manajemen operasional gudang berbasis AI yang mengintegrasikan CCTV dengan pengenalan objek real-time untuk mengoptimalkan proses loading/unloading truk.

---

## 🏢 Tentang Aplikasi

### Nama Produk
**Warehouse AI Dashboard** (atau **LoadingDock AI**)

### Target User
1. **Warehouse Manager** - Memantau operasi keseluruhan, membuat keputusan strategis
2. **Dock Supervisor/Operator** - Mengoperasikan loading dock sehari-hari
3. **Admin/IT** - Mengelola user, kamera, dan konfigurasi sistem

### Core Problem yang Diselesaikan
- Monitoring manual loading dock tidak efisien dan rentan human error
- Sulit melacak status dock secara real-time
- Tidak ada data historis untuk analisis performa
- Kurang visibilitas terhadap operasi warehouse

### Value Proposition
> "AI-powered real-time visibility untuk operasi loading dock - melihat, mendeteksi, dan mengoptimalkan."

---

## 🎨 DESIGN PROMPT (Copy-Paste untuk AI Design Tool)

```
Design a modern, professional warehouse operations dashboard with the following specifications:

**App Type:** B2B SaaS Dashboard for Warehouse Management
**Industry:** Logistics, Warehouse Operations, Supply Chain

**Theme & Style:**
- Color Palette: Lime/Green (#84cc16) as primary accent, Dark Gray (#111827) for text, White (#FFFFFF) backgrounds
- Secondary Colors: Emerald for success states, Orange/Amber for warnings, Red for critical alerts
- Style: Clean, modern, minimal with rounded corners (lg/2xl border-radius)
- Typography: Inter or system font, bold weights for emphasis
- Design Language: Cards with subtle shadows, ample whitespace, clear hierarchy

**Key Screens to Design:**

1. **Dashboard Overview**
   - KPI ribbon at top (4 cards: Active Sessions, Available Docks, Active Drivers, Today Completed)
   - Dock Status Grid (cards showing dock availability with status badges)
   - Live CCTV Preview section (2x2 camera grid with red recording dot)
   - Quick Actions panel (Start Loading, Report Issue, View Cameras)
   - Live Activity Feed

2. **Live Streaming/CCTV View**
   - Multi-camera grid layout (2x2, 3x2, 4x4 options)
   - Individual camera fullscreen mode
   - AI detection overlay (bounding boxes for objects detected)
   - Recording status indicators

3. **Sessions Management**
   - Data table with filters
   - Session details modal
   - Timer/duration display
   - Driver and truck assignment

4. **Dock Management**
   - Dock cards with status (available/loading/maintenance)
   - Visual dock map view
   - Quick status change actions

5. **Analytics/Reports**
   - Charts: Bar, Line, Pie for metrics
   - Date range picker
   - Export functionality

**UI Components Needed:**
- Sidebar navigation (collapsible, icons + labels)
- Top header with search, notifications bell, user avatar
- Data tables with sorting, filtering, pagination
- Modal dialogs for forms and confirmations
- Status badges (Available=green, Loading=orange, Maintenance=red)
- Empty states with illustrations
- Loading skeletons
- Toast notifications

**Accessibility Requirements:**
- WCAG 2.1 AA compliant
- Keyboard navigable
- High contrast mode support
- Minimum 12px font size
- Focus visible states on all interactive elements

**Responsive Behavior:**
- Desktop-first (1280px+)
- Tablet (768px-1279px): Collapse sidebar to icons
- Mobile (320px-767px): Bottom navigation, single column layout

**Mood/Feel:**
- Professional and trustworthy
- Clean and efficient
- Industrial/operational but modern
- Data-driven and real-time feel
```

---

## 🖼️ Visual References

### Color System
| Purpose | Color | Hex Code |
|---------|-------|----------|
| Primary Accent | Lime | `#84cc16` |
| Secondary | Emerald | `#10b981` |
| Warning | Amber/Orange | `#f59e0b` |
| Danger | Red | `#ef4444` |
| Text Primary | Gray 900 | `#111827` |
| Text Secondary | Gray 500 | `#6b7280` |
| Background | White | `#ffffff` |
| Card Background | Gray 50 | `#f9fafb` |

### Typography
- **Headings:** Inter Bold (24-32px for H1, 18-20px for H2)
- **Body:** Inter Regular (14-16px)
- **Labels/Captions:** Inter Medium (12-14px, uppercase tracking)
- **Monospace:** For IDs, plate numbers, codes

### Iconography
- **Style:** Lucide React (outline style, 2px stroke)
- **Size:** 16-24px typically
- **Common Icons:** 
  - Building2 (docks)
  - Truck (vehicles)
  - Users (drivers/staff)
  - Video (cameras)
  - Activity (sessions)
  - Clock (time/duration)
  - Bell (notifications)

---

## 📐 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]    Warehouse AI    [Search]  [🔔] [Avatar]         │  ← Top Header
├──────┬──────────────────────────────────────────────────────┤
│      │                                                      │
│  📊  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  ← KPI Ribbon
│      │  │ Active  │ │ Avail   │ │ Active  │ │ Today   │    │
│  📦  │  │Sessions │ │ Docks   │ │ Drivers │ │Completed│    │
│      │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│  🎥  │                                                      │
│      │  ┌──────────────────────┐ ┌─────────────────────┐   │
│  👥  │  │                      │ │   Quick Actions     │   │
│      │  │    Dock Status       │ │   ──────────────    │   │
│  📈  │  │    Grid              │ │   [Start Loading]   │   │
│      │  │                      │ │   [Report Issue]    │   │
│  ⚙️  │  │   ┌────┐  ┌────┐    │ │   [View Cameras]    │   │
│      │  │   │D-01│  │D-02│    │ │                     │   │
│      │  │   └────┘  └────┘    │ ├─────────────────────┤   │
│      │  │   ┌────┐  ┌────┐    │ │   Recent Activity   │   │
│      │  │   │D-03│  │D-04│    │ │   ──────────────    │   │
│      │  │   └────┘  └────┘    │ │   • Session started │   │
│      │  │                      │ │   • Dock assigned   │   │
│      │  └──────────────────────┘ │   • Loading done    │   │
│      │                           └─────────────────────┘   │
│      │  ┌──────────────────────────────────────────────┐   │
│      │  │  Live Cameras (2x2 Grid)                     │   │
│      │  │  ┌────────┐ ┌────────┐                       │   │
│      │  │  │🔴CAM-01│ │🔴CAM-02│                       │   │
│      │  │  └────────┘ └────────┘                       │   │
│      │  │  ┌────────┐ ┌────────┐                       │   │
│      │  │  │🔴CAM-03│ │🔴CAM-04│                       │   │
│      │  │  └────────┘ └────────┘                       │   │
│      │  └──────────────────────────────────────────────┘   │
└──────┴──────────────────────────────────────────────────────┘
  Sidebar           Main Content Area
```

---

## 🏷️ Key Features untuk Ditonjolkan di UI

1. **Real-time Status** - Live indicators (pulse animation), timestamps, auto-refresh
2. **AI Detection** - Bounding boxes pada video feed, detection confidence badges
3. **Multi-tenant** - Tenant/organization selector, branded experience
4. **Quick Actions** - CTAs yang jelas dan accessible
5. **Data Tables** - Sortable, filterable, searchable, exportable
6. **Empty States** - Friendly illustrations dengan clear CTAs
7. **Loading States** - Skeletons, spinners, progress indicators
8. **Error Handling** - Error boundaries, retry buttons, clear error messages

---

## 🎭 Mood Board Keywords

- **Industrial Modern** - Clean lines, functional, efficient
- **Control Room** - Multiple data points, real-time monitoring
- **Professional B2B** - Trustworthy, enterprise-grade
- **Data-Driven** - Charts, metrics, KPIs
- **Operational Excellence** - Status indicators, alerts, quick actions

---

## 📱 Platform Target

| Platform | Priority | Notes |
|----------|----------|-------|
| Desktop (1280px+) | Primary | Full feature set |
| Tablet (768-1279px) | Secondary | Collapsed sidebar, essential features |
| Mobile (320-767px) | Tertiary | View-only, quick actions, notifications |

---

## ✅ Design Checklist

- [ ] Consistent color palette applied
- [ ] Typography hierarchy established
- [ ] All states designed (default, hover, active, focus, disabled)
- [ ] Empty states for all lists/tables
- [ ] Loading skeletons for async content
- [ ] Error states with recovery actions
- [ ] Responsive breakpoints defined
- [ ] Dark mode variant (optional/future)
- [ ] Accessibility annotations included
- [ ] Component library/design system documented

---

*Dokumen ini dapat digunakan sebagai prompt untuk AI design tools (Figma AI, Galileo AI, Uizard, dll.) atau sebagai brief untuk designer.*
