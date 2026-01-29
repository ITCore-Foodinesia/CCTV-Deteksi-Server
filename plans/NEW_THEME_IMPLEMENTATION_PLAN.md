# New Theme Implementation Plan (UI-Only)

## Executive Summary

This document outlines the **UI-only implementation plan** for integrating the **new admin panel theme** (`new_theme/`) into the existing React dashboard. This focuses on **visual/structural changes only** - no backend integration, no new functionality, just the UI shell and navigation.

### Scope: UI-Only

✅ **In Scope:**

- Sidebar layout and navigation components
- New Dashboard Overview page (with mock/static data)
- Live Streaming page (wrapper around existing CCTV component)
- Theme tokens and styling
- Responsive layout (mobile drawer)

❌ **Out of Scope (for now):**

- React Router integration (keep existing `setCurrentPage()`)
- New API integrations
- RBAC/permissions implementation
- New data models or state management
- Pages beyond Dashboard and Live Streaming

---

## A. Analysis Summary

### Current State (`dashboard/`)

| Aspect      | Current Implementation                         |
| ----------- | ---------------------------------------------- |
| **Stack**   | React 19 + Vite + Tailwind CSS                 |
| **Routing** | Manual state-based (`setCurrentPage()`)        |
| **Theme**   | Glass morphism, Lime accent (`#a3e635`)        |
| **Layout**  | Single dashboard page with CCTV + activity log |

### New Theme Design (`new_theme/`)

| Aspect     | Design                                                 |
| ---------- | ------------------------------------------------------ |
| **Theme**  | Industrial-Professional with Lime/Emerald accents      |
| **Layout** | Sidebar + Header + Content area                        |
| **Colors** | Dark: `#1A2E35`, Primary: `#84CC16`, Accent: `#10B981` |

---

## B. Proposed Navigation Structure

### Sidebar Menu

```
MAIN
├── Dashboard (📊) → shows Dashboard Overview page
└── Live Streaming (📹) → shows current CCTV page ⬅️ REQUESTED POSITION

OPERASIONAL (Coming Soon)
├── Drivers (👤) - disabled
├── Trucks (🚚) - disabled
├── Docks (🏗️) - disabled
├── Helpers (👷) - disabled
└── Loaders (🧑‍🔧) - disabled

AKTIVITAS (Coming Soon)
├── Loading Sessions (⏱️) - disabled
├── History (📜) - disabled
└── Notifications (🔔) - disabled

SISTEM (Coming Soon)
├── Cameras (📹) - disabled
├── Users & Roles (👥) - disabled
└── Settings (⚙️) - disabled

LAPORAN (Coming Soon)
├── Reports (📈) - disabled
└── Analytics (📊) - disabled
```

---

## C. Implementation Phases (UI-Only)

### Phase 1: Theme & Layout Foundation (2-3 hours)

#### 1.1 Update Theme Constants

**File:** `dashboard/src/constants/theme.js`

```javascript
export const THEME = {
  colors: {
    // Existing (keep)
    bg: "bg-[#F5F7F2]",
    primary: "bg-[#a3e635]",
    primaryHover: "hover:bg-[#84cc16]",

    // New theme additions
    dark: "#1A2E35",
    primaryLime: "#84CC16",
    primaryLimeDark: "#4D7C0F",
    accent: "#10B981",
    bgLight: "#F9FAFB",
  },

  // Status colors for dock cards
  dockStatus: {
    available: "border-emerald-500 bg-emerald-50 text-emerald-900",
    loading: "border-orange-500 bg-orange-50 text-orange-900",
    maintenance: "border-red-500 bg-red-50 text-red-900",
    reserved: "border-blue-500 bg-blue-50 text-blue-900",
    closed: "border-gray-500 bg-gray-50 text-gray-900",
  },

  // Existing (keep)
  glass: "bg-white/60 backdrop-blur-md border border-white/60 shadow-xl",
  glassCard: "bg-white/70 backdrop-blur-lg border border-white/50 shadow-lg",
};
```

#### 1.2 Create Navigation Config

**New file:** `dashboard/src/constants/navigation.js`

```javascript
import {
  LayoutDashboard,
  Video,
  User,
  Truck,
  Building2,
  HardHat,
  Package,
  Timer,
  History,
  Bell,
  Camera,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
} from "lucide-react";

export const NAVIGATION = [
  {
    group: "main",
    label: "MAIN",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        page: "dashboard-overview",
        enabled: true,
      },
      {
        key: "live-streaming",
        label: "Live Streaming",
        icon: Video,
        page: "dashboard",
        enabled: true,
        indent: true,
      },
    ],
  },
  {
    group: "operasional",
    label: "OPERASIONAL",
    items: [
      {
        key: "drivers",
        label: "Drivers",
        icon: User,
        page: "drivers",
        enabled: false,
      },
      {
        key: "trucks",
        label: "Trucks",
        icon: Truck,
        page: "trucks",
        enabled: false,
      },
      {
        key: "docks",
        label: "Docks",
        icon: Building2,
        page: "docks",
        enabled: false,
      },
      {
        key: "helpers",
        label: "Helpers",
        icon: HardHat,
        page: "helpers",
        enabled: false,
      },
      {
        key: "loaders",
        label: "Loaders",
        icon: Package,
        page: "loaders",
        enabled: false,
      },
    ],
  },
  {
    group: "aktivitas",
    label: "AKTIVITAS",
    items: [
      {
        key: "sessions",
        label: "Loading Sessions",
        icon: Timer,
        page: "sessions",
        enabled: false,
      },
      {
        key: "history",
        label: "History",
        icon: History,
        page: "history",
        enabled: false,
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: Bell,
        page: "notifications",
        enabled: false,
      },
    ],
  },
  {
    group: "sistem",
    label: "SISTEM",
    items: [
      {
        key: "cameras",
        label: "Cameras",
        icon: Camera,
        page: "cameras",
        enabled: false,
      },
      {
        key: "users",
        label: "Users & Roles",
        icon: Users,
        page: "users",
        enabled: false,
      },
      {
        key: "settings",
        label: "Settings",
        icon: Settings,
        page: "settings",
        enabled: false,
      },
    ],
  },
  {
    group: "laporan",
    label: "LAPORAN",
    items: [
      {
        key: "reports",
        label: "Reports",
        icon: BarChart3,
        page: "reports",
        enabled: false,
      },
      {
        key: "analytics",
        label: "Analytics",
        icon: TrendingUp,
        page: "analytics",
        enabled: false,
      },
    ],
  },
];
```

---

### Phase 2: Sidebar & Layout Components (3-4 hours)

#### 2.1 Create Sidebar Component

**New file:** `dashboard/src/components/layout/Sidebar.jsx`

Key features:

- Fixed width sidebar (w-64) on desktop
- Grouped navigation items
- Active state highlighting (emerald)
- Disabled state for coming-soon items
- Brand logo at top

```jsx
// Visual structure
<aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
  {/* Logo */}
  <div className="px-4 py-4 border-b border-gray-100">
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#84CC16] text-white shadow-sm">
        🏭
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">GUDANG DRIVER</div>
        <div className="text-xs text-gray-500">Admin Panel</div>
      </div>
    </div>
  </div>

  {/* Navigation */}
  <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
    {/* Groups rendered here */}
  </nav>
</aside>
```

#### 2.2 Create TopHeader Component

**New file:** `dashboard/src/components/layout/TopHeader.jsx`

Key features:

- Mobile menu button (hamburger)
- Connection status indicator
- Notification bell
- User profile button

```jsx
<header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
  <div className="flex items-center gap-3 px-4 py-3">
    {/* Mobile menu button */}
    <button className="lg:hidden rounded-xl p-2 hover:bg-gray-100">
      <Menu className="h-5 w-5" />
    </button>

    {/* Spacer */}
    <div className="flex-1" />

    {/* Connection status */}
    <ConnectionIndicator connected={connected} />

    {/* Notifications */}
    <button className="relative rounded-xl p-2 hover:bg-gray-100">
      <Bell className="h-5 w-5" />
      <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white">
        3
      </span>
    </button>

    {/* Profile */}
    <button className="rounded-xl bg-[#1A2E35] px-3 py-2 text-sm font-semibold text-white">
      👤 Admin Demo
    </button>
  </div>
</header>
```

#### 2.3 Create MobileDrawer Component

**New file:** `dashboard/src/components/layout/MobileDrawer.jsx`

Key features:

- Slide-in overlay for mobile
- Same navigation as sidebar
- Close button and backdrop click to dismiss

#### 2.4 Create DashboardShell Component

**New file:** `dashboard/src/components/layout/DashboardShell.jsx`

This wraps all authenticated pages:

```jsx
const DashboardShell = ({ children, currentPage, onNavigate, connected }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Desktop Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <TopHeader
          connected={connected}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};
```

---

### Phase 3: Dashboard Overview Page (3-4 hours)

#### 3.1 Create Dashboard Overview Page

**New file:** `dashboard/src/pages/DashboardOverview.jsx`

This is the **new main dashboard** with:

- KPI cards grid (4 cards)
- Dock Status grid (4 dock cards with status colors)
- Quick Actions panel
- Recent Activity feed

**All data is MOCK/STATIC** for UI demonstration.

```jsx
// Mock data
const MOCK_KPIS = [
  { label: "Active Sessions", value: 3, icon: Timer },
  { label: "Available Docks", value: 2, icon: Building2 },
  { label: "Total Drivers", value: 15, icon: User },
  { label: "Today Completed", value: 8, icon: CheckCircle },
];

const MOCK_DOCKS = [
  { code: "D-01", name: "Dock Utama 1", status: "available" },
  { code: "D-02", name: "Dock Utama 2", status: "loading", plate: "B 1234 XY" },
  { code: "D-03", name: "Dock Samping", status: "available" },
  {
    code: "D-04",
    name: "Dock Maintenance",
    status: "maintenance",
    reason: "Perbaikan lantai",
  },
];

const MOCK_ACTIVITY = [
  {
    icon: "🟢",
    text: 'Driver "Budi" started loading at D-02',
    time: "2 min ago",
  },
  { icon: "🟡", text: "Dock D-04 set to maintenance", time: "18 min ago" },
  { icon: "🔵", text: 'Driver "Ahmad" waiting at D-01', time: "55 min ago" },
];
```

#### 3.2 KPI Card Design

```jsx
<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100">
      <Icon className="h-5 w-5 text-gray-600" />
    </div>
  </div>
</div>
```

#### 3.3 Dock Status Card Design

```jsx
<div
  className={`rounded-2xl border-2 p-4 shadow-sm ${getDockStatusClass(status)}`}
>
  <div className="flex items-start justify-between gap-2">
    <div>
      <div className="text-sm font-semibold">{code}</div>
      <div className="text-xs opacity-80">{name}</div>
      <div className="mt-1 text-xs uppercase tracking-wider opacity-80">
        {status}
      </div>
      {plate && <div className="mt-2 text-xs">🚚 {plate}</div>}
    </div>
    <button className="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white">
      Details
    </button>
  </div>
</div>
```

---

### Phase 4: Live Streaming Page Wrapper (1-2 hours)

#### 4.1 Wrap Existing Dashboard as Live Streaming

**Modify:** `dashboard/src/components/WarehouseAIDashboard.jsx`

The existing CCTV dashboard becomes the "Live Streaming" page content. Changes needed:

- Remove the outer container (min-h-screen, max-w-4xl) - handled by shell
- Remove the Header component - handled by TopHeader in shell
- Keep all CCTV and activity log functionality intact

```diff
const WarehouseAIDashboard = ({ onNavigate }) => {
  // ... existing state and hooks

  return (
-   <div className="min-h-screen bg-slate-200">
-     <div className="max-w-4xl mx-auto p-2 md:p-4 ... min-h-screen">
-       <Header connected={connected} ... />
+   <div className="h-full">
+     <div className="flex flex-col gap-4">
+       {/* Page title */}
+       <div className="flex items-center justify-between">
+         <h1 className="text-xl font-semibold text-gray-900">Live Streaming</h1>
+         <ConnectionBadge connected={connected} />
+       </div>

        {/* Rest of content stays the same */}
```

---

### Phase 5: Wire Up App.jsx (1 hour)

#### 5.1 Update App.jsx Page Router

**Modify:** `dashboard/src/App.jsx`

Add the new page cases and wrap authenticated pages with DashboardShell:

```jsx
const renderPage = () => {
  // Public pages (no shell)
  if (!isAuthenticated) {
    switch (currentPage) {
      case 'landing': return <LandingPage onNavigate={setCurrentPage} />;
      case 'login': return <LoginPage onNavigate={setCurrentPage} />;
      case 'signup': return <SignupPage onNavigate={setCurrentPage} />;
      case 'forgot-password': return <ForgotPasswordPage onNavigate={setCurrentPage} />;
      default: return <LandingPage onNavigate={setCurrentPage} />;
    }
  }

  // Authenticated pages (with shell)
  let pageContent;
  switch (currentPage) {
    case 'dashboard-overview':
      pageContent = <DashboardOverview />;
      break;
    case 'dashboard': // Live Streaming
      pageContent = <WarehouseAIDashboard onNavigate={setCurrentPage} />;
      break;
    default:
      pageContent = <DashboardOverview />;
  }

  return (
    <DashboardShell
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      connected={/* from context or prop */}
    >
      {pageContent}
    </DashboardShell>
  );
};
```

---

## D. File Structure After Implementation

```
dashboard/src/
├── App.jsx                          # Updated with DashboardShell
├── constants/
│   ├── theme.js                     # Updated with new tokens
│   └── navigation.js                # NEW: Sidebar nav config
│
├── components/
│   ├── layout/                      # NEW: Layout components
│   │   ├── Sidebar.jsx
│   │   ├── TopHeader.jsx
│   │   ├── MobileDrawer.jsx
│   │   ├── DashboardShell.jsx
│   │   └── index.js
│   │
│   ├── WarehouseAIDashboard.jsx     # Modified (Live Streaming content)
│   └── ... (existing components)
│
├── pages/
│   ├── DashboardOverview.jsx        # NEW: Dashboard with KPIs/Docks
│   ├── LandingPage.jsx              # Existing
│   └── index.js
│
└── ... (other existing files)
```

---

## E. Implementation Checklist

### Phase 1: Foundation

- [ ] Update `theme.js` with new tokens
- [ ] Create `navigation.js` config file

### Phase 2: Layout

- [ ] Create `Sidebar.jsx`
- [ ] Create `TopHeader.jsx`
- [ ] Create `MobileDrawer.jsx`
- [ ] Create `DashboardShell.jsx`
- [ ] Create `components/layout/index.js`

### Phase 3: Dashboard Overview

- [ ] Create `DashboardOverview.jsx` with mock data
- [ ] Create KPI cards component
- [ ] Create Dock status grid component
- [ ] Create Quick actions panel
- [ ] Create Recent activity feed

### Phase 4: Live Streaming

- [ ] Modify `WarehouseAIDashboard.jsx` to remove outer shell
- [ ] Add page title header
- [ ] Test CCTV functionality still works

### Phase 5: Wire Up

- [ ] Update `App.jsx` with new page routing
- [ ] Test navigation between pages
- [ ] Test mobile drawer

---

## F. Timeline Estimate (UI-Only)

| Phase                       | Duration        |
| --------------------------- | --------------- |
| Phase 1: Foundation         | 2-3 hours       |
| Phase 2: Layout             | 3-4 hours       |
| Phase 3: Dashboard Overview | 3-4 hours       |
| Phase 4: Live Streaming     | 1-2 hours       |
| Phase 5: Wire Up            | 1 hour          |
| **Total**                   | **10-14 hours** |

---

## G. Visual Reference

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  TopHeader [ ☰ mobile only ] [ spacer ] [ 🔔 ] [ 👤 Admin ]     │
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                 │
│  🏭 GUDANG     │   Page Content                                  │
│  DRIVER        │                                                 │
│  Admin Panel   │   - DashboardOverview (KPIs, Docks, Activity)   │
│                │   - OR -                                        │
│  ─────────     │   - WarehouseAIDashboard (CCTV Live Streaming)  │
│  MAIN          │                                                 │
│   📊 Dashboard │                                                 │
│   📹 Live      │                                                 │
│                │                                                 │
│  OPERASIONAL   │                                                 │
│   👤 Drivers   │                                                 │
│   🚚 Trucks    │                                                 │
│   ...          │                                                 │
│                │                                                 │
│  (more groups) │                                                 │
│                │                                                 │
└────────────────┴─────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────────┐
│  ☰  [ spacer ] 🔔  👤   │
├──────────────────────────┤
│                          │
│  Page Content            │
│  (full width)            │
│                          │
│                          │
│                          │
│                          │
└──────────────────────────┘

Drawer (when ☰ tapped):
┌──────────────────┬───────┐
│ 🏭 GUDANG     ✕  │░░░░░░░│
│ DRIVER           │░░░░░░░│
│ Admin Panel      │░░░░░░░│
│ ──────           │░░░░░░░│
│ 📊 Dashboard     │░░░░░░░│
│ 📹 Live Streaming│░░░░░░░│
│ ...              │░░░░░░░│
└──────────────────┴───────┘
```

---

## H. Notes & Assumptions

1. **No React Router** - Keep existing `setCurrentPage()` approach
2. **Mock data only** - Dashboard Overview uses hardcoded data
3. **Existing functionality preserved** - CCTV and WebSocket still work
4. **Disabled menu items** - Show "Coming Soon" for future pages
5. **Responsive** - Mobile drawer, desktop sidebar

---

_Document created: 2026-01-29_  
_Focus: UI-Only Implementation_  
_Estimated effort: 10-14 hours_
