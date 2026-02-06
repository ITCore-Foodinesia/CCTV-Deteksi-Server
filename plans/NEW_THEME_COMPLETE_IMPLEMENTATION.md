# New Theme Complete Implementation Plan

## Executive Summary

This document outlines the **complete implementation plan** for integrating the **new admin panel theme** (`new_theme/`) into the existing React dashboard, including:

1. **React Router integration** for proper routing
2. **New Dashboard page** - Main overview with dock status, KPIs, quick actions
3. **Live Streaming page** - Current CCTV monitoring (migrated from existing dashboard)
4. **Sidebar navigation** - Collapsible sidebar with grouped menu items
5. **Full page structure** for all menu items (placeholder pages)
6. **RBAC foundation** - Role-based menu visibility

> **Note:** For a lighter UI-only implementation, see [`NEW_THEME_IMPLEMENTATION_PLAN.md`](NEW_THEME_IMPLEMENTATION_PLAN.md)

---

## A. Analysis Summary

### Current State (`dashboard/`)

| Aspect      | Current Implementation                                       |
| ----------- | ------------------------------------------------------------ |
| **Stack**   | React 19 + Vite + Tailwind CSS                               |
| **Routing** | Manual state-based (`setCurrentPage()`)                      |
| **Theme**   | Glass morphism, Lime accent (`#a3e635`), soft bg (`#F5F7F2`) |
| **Layout**  | Single dashboard page with stats + CCTV + activity log       |
| **Auth**    | AuthContext with Supabase integration                        |
| **Pages**   | Landing, Login, Signup, ForgotPassword, Dashboard            |

### New Theme Analysis (`new_theme/`)

| Aspect      | Implementation                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Stack**   | Vanilla JS + Tailwind CDN (prototype only)                                                                                          |
| **Routing** | Hash-based routing (`#/dashboard`, `#/drivers`)                                                                                     |
| **Theme**   | Industrial-Professional with Lime/Emerald accents                                                                                   |
| **Layout**  | Sidebar + Header + Content area                                                                                                     |
| **RBAC**    | Role-based menu visibility (owner/admin/member)                                                                                     |
| **Pages**   | Dashboard, Drivers, Trucks, Docks, Helpers, Loaders, Sessions, History, Notifications, Cameras, Users, Settings, Reports, Analytics |

### Theme Design Tokens (from `new_theme`)

```css
/* Core palette */
--gd-dark: #1a2e35; /* Dark slate - sidebar/header */
--gd-primary: #84cc16; /* Lime-500 */
--gd-primary-dark: #4d7c0f;
--gd-primary-light: #a3e635;
--gd-accent: #10b981; /* Emerald-500 */
--gd-bg: #f9fafb; /* Light gray background */
```

---

## B. Proposed Architecture

### Page Structure

```
/                       → Landing Page (public)
/login                  → Login Page (public)
/signup                 → Signup Page (public)
/forgot-password        → Forgot Password (public)

/app                    → Dashboard Layout (authenticated)
├── /app/dashboard      → New Dashboard (KPIs, Dock Status, Quick Actions)
├── /app/live-streaming → Live Streaming (CCTV Monitoring) ⬅️ CURRENT DASHBOARD
├── /app/drivers        → Drivers Management
├── /app/trucks         → Trucks Management
├── /app/docks          → Docks Management
├── /app/helpers        → Helpers Management
├── /app/loaders        → Loaders Management
├── /app/sessions       → Loading Sessions
├── /app/history        → History
├── /app/notifications  → Notifications
├── /app/cameras        → Cameras
├── /app/users          → Users & Roles (owner only)
├── /app/settings       → Settings (owner only)
├── /app/reports        → Reports
└── /app/analytics      → Analytics
```

### Sidebar Navigation Structure

```
MAIN
├── Dashboard (📊) → /app/dashboard

MAIN (Sub)
└── Live Streaming (📹) → /app/live-streaming  ⬅️ POSITION REQUESTED

OPERASIONAL
├── Drivers (👤) → /app/drivers
├── Trucks (🚚) → /app/trucks
├── Docks (🏗️) → /app/docks
├── Helpers (👷) → /app/helpers
└── Loaders (🧑‍🔧) → /app/loaders

AKTIVITAS
├── Loading Sessions (⏱️) → /app/sessions
├── History (📜) → /app/history
└── Notifications (🔔) → /app/notifications

SISTEM
├── Cameras (📹) → /app/cameras
├── Users & Roles (👥) → /app/users
└── Settings (⚙️) → /app/settings

LAPORAN
├── Reports (📈) → /app/reports
└── Analytics (📊) → /app/analytics
```

---

## C. Implementation Phases

### Phase 1: Foundation (Estimated: 4-6 hours)

#### 1.1 Add React Router

- Install `react-router-dom`
- Replace manual `setCurrentPage()` with proper routing
- Create route structure for public + protected routes

**Files to modify/create:**

- `dashboard/package.json` (add dependency)
- `dashboard/src/App.jsx` (add Router)
- `dashboard/src/routes/` (new folder)
  - `index.jsx` - Route definitions
  - `ProtectedRoute.jsx` - Auth guard

**Installation:**

```bash
cd dashboard
npm install react-router-dom
```

#### 1.2 Update Theme Constants

- Merge new theme tokens into `theme.js`
- Keep backward compatibility with existing components

**Files to modify:**

- `dashboard/src/constants/theme.js`

```javascript
// Add new tokens
export const THEME = {
  colors: {
    // Existing
    bg: "bg-[#F5F7F2]",
    primary: "bg-[#a3e635]",
    primaryHover: "hover:bg-[#84cc16]",
    primaryText: "text-gray-800",
    secondaryText: "text-gray-500",
    accentBlue: "text-[#3b82f6]",
    accentEmerald: "text-[#10b981]",
    accentRose: "text-[#f43f5e]",

    // New theme additions
    dark: "#1A2E35",
    primaryLime: "#84CC16",
    primaryLimeDark: "#4D7C0F",
    primaryLimeLight: "#A3E635",
    accent: "#10B981",
    bgLight: "#F9FAFB",
  },

  // Dock status colors
  dockStatus: {
    available: "border-emerald-500 bg-emerald-50 text-emerald-900",
    loading: "border-orange-500 bg-orange-50 text-orange-900",
    unloading: "border-orange-500 bg-orange-50 text-orange-900",
    maintenance: "border-red-500 bg-red-50 text-red-900",
    reserved: "border-blue-500 bg-blue-50 text-blue-900",
    closed: "border-gray-500 bg-gray-50 text-gray-900",
  },

  // Status badge colors
  statusBadge: {
    active: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    pending_approval: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    suspended: "bg-red-100 text-red-800 ring-1 ring-red-200",
    inactive: "bg-gray-100 text-gray-800 ring-1 ring-gray-200",
  },

  // Existing (keep)
  glass: "bg-white/60 backdrop-blur-md border border-white/60 shadow-xl",
  glassCard:
    "bg-white/70 backdrop-blur-lg border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300",
  input:
    "w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/50 focus:outline-none transition-all placeholder-gray-400 text-gray-800",
  button:
    "w-full py-3 px-6 rounded-xl font-semibold shadow-lg shadow-lime-300/50 transition-all active:scale-95 flex items-center justify-center gap-2",
};
```

---

### Phase 2: Layout Components (Estimated: 6-8 hours)

#### 2.1 Create Dashboard Layout Shell

**New files:**

- `dashboard/src/layouts/DashboardLayout.jsx`
  - Sidebar + Header + Content area wrapper
  - Mobile drawer support
  - Role-based menu visibility
  - Uses React Router's `<Outlet />` for nested routes

```
┌────────────────────────────────────────────────────────────┐
│ Header (Tenant Selector, Notifications, Profile)           │
├─────────────┬──────────────────────────────────────────────┤
│             │                                               │
│  Sidebar    │              Main Content                     │
│  (collapsible)               <Outlet />                    │
│             │                                               │
│  - Dashboard│                                               │
│    └ Live   │                                               │
│  - Operasional                                              │
│  - Aktivitas│                                               │
│  - Sistem   │                                               │
│  - Laporan  │                                               │
│             │                                               │
└─────────────┴──────────────────────────────────────────────┘
```

**Components to create:**

- `dashboard/src/components/layout/Sidebar.jsx`
- `dashboard/src/components/layout/SidebarItem.jsx`
- `dashboard/src/components/layout/SidebarGroup.jsx`
- `dashboard/src/components/layout/TopHeader.jsx` (new header with tenant selector)
- `dashboard/src/components/layout/MobileDrawer.jsx`
- `dashboard/src/components/layout/index.js`

#### 2.2 Sidebar Component Details

**File:** `dashboard/src/components/layout/Sidebar.jsx`

```jsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { NAVIGATION } from "../../constants/navigation";
import { useAuth } from "../../contexts/AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role || "member";

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
      {/* Logo */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#84CC16] text-[#1A2E35] shadow-sm">
            🏭
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-gray-900">
              GUDANG DRIVER
            </div>
            <div className="text-xs text-gray-500">Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {NAVIGATION.map((group) => (
          <SidebarGroup
            key={group.group}
            group={group}
            currentPath={location.pathname}
            role={role}
          />
        ))}
      </nav>

      {/* Role indicator */}
      <div className="border-t border-gray-200 p-3">
        <div className="text-xs text-gray-500">Role</div>
        <div className="mt-1 text-sm font-medium text-gray-900 capitalize">
          {role}
        </div>
      </div>
    </aside>
  );
};
```

#### 2.3 TopHeader Component

**File:** `dashboard/src/components/layout/TopHeader.jsx`

```jsx
import React, { useState } from "react";
import { Bell, User, Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const TopHeader = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-[14px] p-2 hover:bg-gray-100"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="relative rounded-[14px] p-2 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              3
            </span>
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="rounded-[14px] bg-[#1A2E35] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              <User className="h-4 w-4 inline mr-2" />
              {user?.name || "User"}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold">{user?.name}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <div className="my-2 h-px bg-gray-200" />
                <button
                  onClick={signOut}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
```

#### 2.4 DashboardLayout Component

**File:** `dashboard/src/layouts/DashboardLayout.jsx`

```jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, TopHeader, MobileDrawer } from "../components/layout";

const DashboardLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
```

---

### Phase 3: New Dashboard Page (Estimated: 4-6 hours)

#### 3.1 Create New Dashboard Component

**New files:**

- `dashboard/src/pages/dashboard/DashboardPage.jsx`
- `dashboard/src/pages/dashboard/components/KPIGrid.jsx`
- `dashboard/src/pages/dashboard/components/DockStatusGrid.jsx`
- `dashboard/src/pages/dashboard/components/QuickActions.jsx`
- `dashboard/src/pages/dashboard/components/RecentActivity.jsx`
- `dashboard/src/pages/dashboard/index.js`

**Features:**

- KPI cards (Active Sessions, Available Docks, Total Drivers, Today Completed)
- Dock Status grid with real-time status colors
- Quick Actions panel
- Recent Activity feed

#### 3.2 Design Specifications (from new_theme)

**KPI Card Design:**

```jsx
// Rounded-2xl, border-gray-200, bg-white, shadow-sm
<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm text-gray-500">Active Sessions</div>
      <div className="mt-1 text-2xl font-semibold">12</div>
    </div>
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-xl">
      ⏱️
    </div>
  </div>
</div>
```

**Dock Status Card Design:**

```jsx
// Dynamic border/bg based on status
const dockStatusStyles = {
  available: "border-emerald-500 bg-emerald-50 text-emerald-900",
  loading: "border-orange-500 bg-orange-50 text-orange-900",
  unloading: "border-orange-500 bg-orange-50 text-orange-900",
  maintenance: "border-red-500 bg-red-50 text-red-900",
  reserved: "border-blue-500 bg-blue-50 text-blue-900",
  closed: "border-gray-500 bg-gray-50 text-gray-900",
};

<div
  className={`rounded-2xl border-2 p-4 shadow-sm ${dockStatusStyles[status]}`}
>
  <div className="flex items-start justify-between gap-2">
    <div>
      <div className="text-sm font-semibold">
        {dock_code}{" "}
        <span className="text-xs font-normal opacity-80">{dock_name}</span>
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider opacity-80">
        {status}
      </div>
      {plate && <div className="mt-2 text-xs">🚚 {plate}</div>}
      {started_at && (
        <div className="mt-1 text-xs">Started: {formatTime(started_at)}</div>
      )}
    </div>
    <button className="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white">
      {status === "maintenance" ? "End Maint" : "Set Maint"}
    </button>
  </div>
</div>;
```

#### 3.3 DashboardPage Component

**File:** `dashboard/src/pages/dashboard/DashboardPage.jsx`

```jsx
import React from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import KPIGrid from "./components/KPIGrid";
import DockStatusGrid from "./components/DockStatusGrid";
import QuickActions from "./components/QuickActions";
import RecentActivity from "./components/RecentActivity";

const DashboardPage = () => {
  const { connected, stats, activities } = useWebSocket();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Overview of warehouse operations
          </p>
        </div>
        <button className="rounded-[14px] bg-gray-100 px-4 py-2 text-sm font-semibold hover:bg-gray-200">
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <KPIGrid stats={stats} />

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Dock Status - 2 cols */}
        <div className="lg:col-span-2">
          <DockStatusGrid />
        </div>

        {/* Quick Actions - 1 col */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity activities={activities} />
    </div>
  );
};

export default DashboardPage;
```

---

### Phase 4: Live Streaming Page (Estimated: 3-4 hours)

#### 4.1 Migrate Current Dashboard to Live Streaming

**Rename/Move:**

- `dashboard/src/components/WarehouseAIDashboard.jsx`
  → `dashboard/src/pages/live-streaming/LiveStreamingPage.jsx`

**Modifications:**

- Remove standalone layout (header handled by DashboardLayout)
- Keep CCTV feed as primary focus
- Keep Activity Log sidebar
- Keep real-time WebSocket integration
- Adjust spacing for embedded layout

**New structure:**

- `dashboard/src/pages/live-streaming/LiveStreamingPage.jsx`
- `dashboard/src/pages/live-streaming/components/StreamViewer.jsx` (from CCTVFeed)
- `dashboard/src/pages/live-streaming/components/StreamActivityLog.jsx` (from ActivityLog)
- `dashboard/src/pages/live-streaming/index.js`

#### 4.2 Component Adjustments

```diff
- const WarehouseAIDashboard = ({ onNavigate }) => {
+ const LiveStreamingPage = () => {
  // ... existing state and hooks

  return (
-   <div className="min-h-screen bg-slate-200">
-     <div className="max-w-4xl mx-auto p-2 md:p-4 font-sans text-slate-600 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-[#F5F7F2] shadow-xl">
-       <Header connected={connected} status={status} onNavigate={onNavigate} />
+   <div className="h-full">
+     {/* Page Header */}
+     <div className="flex items-center justify-between mb-4">
+       <div>
+         <h1 className="text-xl font-semibold tracking-tight">Live Streaming</h1>
+         <p className="text-sm text-gray-500">Real-time CCTV monitoring</p>
+       </div>
+       <ConnectionBadge connected={connected} status={status} />
+     </div>

        {/* Rest of content stays mostly the same */}
```

---

### Phase 5: Routing Integration (Estimated: 2-3 hours)

#### 5.1 Route Configuration

**File: `dashboard/src/routes/index.jsx`**

```jsx
import { createBrowserRouter, Navigate } from "react-router-dom";

// Public pages
import { LandingPage } from "../pages";
import { LoginPage, SignupPage, ForgotPasswordPage } from "../components/auth";

// Protected layout
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";

// Protected pages
import DashboardPage from "../pages/dashboard/DashboardPage";
import LiveStreamingPage from "../pages/live-streaming/LiveStreamingPage";
import ComingSoonPage from "../pages/coming-soon/ComingSoonPage";

export const router = createBrowserRouter([
  // Public routes
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },

  // Protected routes
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "live-streaming", element: <LiveStreamingPage /> },

      // Placeholder pages (Coming Soon)
      { path: "drivers", element: <ComingSoonPage title="Drivers" /> },
      { path: "trucks", element: <ComingSoonPage title="Trucks" /> },
      { path: "docks", element: <ComingSoonPage title="Docks" /> },
      { path: "helpers", element: <ComingSoonPage title="Helpers" /> },
      { path: "loaders", element: <ComingSoonPage title="Loaders" /> },
      {
        path: "sessions",
        element: <ComingSoonPage title="Loading Sessions" />,
      },
      { path: "history", element: <ComingSoonPage title="History" /> },
      {
        path: "notifications",
        element: <ComingSoonPage title="Notifications" />,
      },
      { path: "cameras", element: <ComingSoonPage title="Cameras" /> },
      { path: "users", element: <ComingSoonPage title="Users & Roles" /> },
      { path: "settings", element: <ComingSoonPage title="Settings" /> },
      { path: "reports", element: <ComingSoonPage title="Reports" /> },
      { path: "analytics", element: <ComingSoonPage title="Analytics" /> },
    ],
  },
]);
```

#### 5.2 ProtectedRoute Component

**File: `dashboard/src/routes/ProtectedRoute.jsx`**

```jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7F2]">
        <div className="w-12 h-12 border-4 border-[#a3e635] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
```

#### 5.3 Navigation Config

**File: `dashboard/src/constants/navigation.js`**

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

// Permission checks (simplified)
const permissions = {
  viewDashboard: (role) => ["owner", "admin", "member"].includes(role),
  manageDrivers: (role) => ["owner", "admin"].includes(role),
  manageTrucks: (role) => ["owner", "admin"].includes(role),
  manageDocks: (role) => ["owner", "admin"].includes(role),
  viewSessions: (role) => ["owner", "admin", "member"].includes(role),
  sendNotifications: (role) => ["owner", "admin"].includes(role),
  manageUsers: (role) => ["owner"].includes(role),
  manageSettings: (role) => ["owner"].includes(role),
  viewReports: (role) => ["owner", "admin", "member"].includes(role),
};

export const NAVIGATION = [
  {
    group: "main",
    label: "MAIN",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/app/dashboard",
        gate: permissions.viewDashboard,
      },
    ],
    subItems: [
      {
        key: "live-streaming",
        label: "Live Streaming",
        icon: Video,
        path: "/app/live-streaming",
        gate: permissions.viewDashboard,
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
        path: "/app/drivers",
        gate: permissions.manageDrivers,
      },
      {
        key: "trucks",
        label: "Trucks",
        icon: Truck,
        path: "/app/trucks",
        gate: permissions.manageTrucks,
      },
      {
        key: "docks",
        label: "Docks",
        icon: Building2,
        path: "/app/docks",
        gate: permissions.manageDocks,
      },
      {
        key: "helpers",
        label: "Helpers",
        icon: HardHat,
        path: "/app/helpers",
        gate: permissions.manageDrivers,
      },
      {
        key: "loaders",
        label: "Loaders",
        icon: Package,
        path: "/app/loaders",
        gate: permissions.manageDrivers,
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
        path: "/app/sessions",
        gate: permissions.viewSessions,
      },
      {
        key: "history",
        label: "History",
        icon: History,
        path: "/app/history",
        gate: permissions.viewSessions,
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: Bell,
        path: "/app/notifications",
        gate: permissions.sendNotifications,
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
        path: "/app/cameras",
        gate: permissions.manageDocks,
      },
      {
        key: "users",
        label: "Users & Roles",
        icon: Users,
        path: "/app/users",
        gate: permissions.manageUsers,
      },
      {
        key: "settings",
        label: "Settings",
        icon: Settings,
        path: "/app/settings",
        gate: permissions.manageSettings,
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
        path: "/app/reports",
        gate: permissions.viewReports,
      },
      {
        key: "analytics",
        label: "Analytics",
        icon: TrendingUp,
        path: "/app/analytics",
        gate: permissions.viewReports,
      },
    ],
  },
];

export { permissions };
```

#### 5.4 Update App.jsx

**File: `dashboard/src/App.jsx`**

```jsx
import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { THEME } from "./constants/theme";

function App() {
  return (
    <AuthProvider>
      <div
        className={`${THEME.colors.bg} font-sans selection:bg-lime-200 selection:text-lime-900 min-h-screen`}
      >
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  );
}

export default App;
```

---

### Phase 6: Polish & Testing (Estimated: 3-4 hours)

#### 6.1 Visual Consistency

- Apply consistent border-radius (`rounded-2xl` / `rounded-[14px]`)
- Standardize shadow depths
- Ensure button hover states match theme
- Test responsive breakpoints

#### 6.2 Accessibility Audit

- Keyboard navigation for sidebar
- Focus visible states
- ARIA labels for icons-only buttons
- Screen reader announcements for route changes

#### 6.3 Testing Checklist

- [ ] Landing → Login → Dashboard flow
- [ ] Sidebar navigation between pages
- [ ] Mobile drawer open/close
- [ ] Role-based menu visibility
- [ ] WebSocket reconnection in Live Streaming
- [ ] Theme token consistency across pages

---

## D. File Structure After Implementation

```
dashboard/src/
├── App.jsx                          # Router setup
├── main.jsx                         # React entry point
├── index.css                        # Global styles
│
├── constants/
│   ├── theme.js                     # Updated theme tokens
│   └── navigation.js                # NEW: Sidebar nav config + permissions
│
├── contexts/
│   └── AuthContext.jsx              # Existing auth context
│
├── hooks/
│   └── useWebSocket.js              # Existing WebSocket hook
│
├── routes/
│   ├── index.jsx                    # NEW: Route definitions
│   └── ProtectedRoute.jsx           # NEW: Auth guard
│
├── layouts/
│   └── DashboardLayout.jsx          # NEW: Sidebar + Header shell
│
├── components/
│   ├── layout/                      # NEW: Layout components
│   │   ├── Sidebar.jsx
│   │   ├── SidebarItem.jsx
│   │   ├── SidebarGroup.jsx
│   │   ├── TopHeader.jsx
│   │   ├── MobileDrawer.jsx
│   │   └── index.js
│   │
│   ├── ui/                          # Shared UI components
│   │   ├── InputField.jsx           # Existing
│   │   ├── Card.jsx                 # NEW: Base card component
│   │   ├── Badge.jsx                # NEW: Status badge
│   │   └── index.js
│   │
│   ├── auth/                        # Auth pages (existing)
│   │   └── ...
│   │
│   ├── landing/                     # Landing components (existing)
│   │   └── ...
│   │
│   ├── Header.jsx                   # Existing (for backwards compat)
│   ├── StatsCard.jsx                # Existing
│   ├── CCTVFeed.jsx                 # Existing
│   └── ActivityLog.jsx              # Existing
│
├── pages/
│   ├── index.js                     # Page exports
│   ├── LandingPage.jsx              # Existing
│   │
│   ├── dashboard/                   # NEW: Dashboard page
│   │   ├── DashboardPage.jsx
│   │   ├── components/
│   │   │   ├── KPIGrid.jsx
│   │   │   ├── DockStatusGrid.jsx
│   │   │   ├── QuickActions.jsx
│   │   │   └── RecentActivity.jsx
│   │   └── index.js
│   │
│   ├── live-streaming/              # NEW: Live Streaming page
│   │   ├── LiveStreamingPage.jsx    # Migrated from WarehouseAIDashboard
│   │   ├── components/
│   │   │   └── ... (reused from existing)
│   │   └── index.js
│   │
│   └── coming-soon/                 # NEW: Placeholder pages
│       └── ComingSoonPage.jsx
│
└── services/
    └── api.js                       # Existing API service
```

---

## E. Migration Checklist

### Pre-Implementation

- [ ] Backup current working state (git commit)
- [ ] Install react-router-dom
- [ ] Review and update package.json

### Phase 1: Foundation

- [ ] Add react-router-dom dependency
- [ ] Create routes folder with index.jsx
- [ ] Create ProtectedRoute component
- [ ] Update theme.js with new tokens
- [ ] Create navigation.js config

### Phase 2: Layout

- [ ] Create DashboardLayout.jsx
- [ ] Create Sidebar components
- [ ] Create TopHeader component
- [ ] Create MobileDrawer component
- [ ] Test layout responsiveness

### Phase 3: Dashboard Page

- [ ] Create DashboardPage.jsx
- [ ] Create KPIGrid component
- [ ] Create DockStatusGrid component
- [ ] Create QuickActions component
- [ ] Create RecentActivity component
- [ ] Connect to WebSocket for real-time data

### Phase 4: Live Streaming Page

- [ ] Create LiveStreamingPage.jsx (migrate from WarehouseAIDashboard)
- [ ] Adjust layout for embedded view
- [ ] Keep all WebSocket functionality
- [ ] Test CCTV feed display

### Phase 5: Routing

- [ ] Update App.jsx with RouterProvider
- [ ] Configure all routes
- [ ] Create ComingSoonPage for placeholders
- [ ] Update navigation links in landing page
- [ ] Test auth flows with new routing

### Phase 6: Polish

- [ ] Visual consistency check
- [ ] Accessibility audit
- [ ] Mobile testing
- [ ] Performance check
- [ ] Clean up unused code

---

## F. Risk Assessment

| Risk                                     | Probability | Impact | Mitigation                                                    |
| ---------------------------------------- | ----------- | ------ | ------------------------------------------------------------- |
| Breaking existing CCTV functionality     | Medium      | High   | Keep CCTVFeed component unchanged, only wrap in new page      |
| WebSocket disconnection during migration | Low         | Medium | Test WebSocket in both old and new structure before switching |
| Auth flow disruption                     | Medium      | High   | Test auth thoroughly with new routing before merging          |
| Mobile layout regression                 | Medium      | Medium | Use same responsive breakpoints (lg:, md:, sm:)               |
| Theme inconsistency                      | Low         | Low    | Create shared Card/Badge components with theme tokens         |

---

## G. Success Metrics

| Metric                   | Target                  | How to Measure         |
| ------------------------ | ----------------------- | ---------------------- |
| Page load time           | < 2s                    | Lighthouse performance |
| Time to first CCTV frame | Same as current         | Manual testing         |
| Navigation accessibility | 100% keyboard navigable | Keyboard testing       |
| Mobile usability         | No horizontal scroll    | Device testing         |
| Route transitions        | No full page reload     | Dev tools network tab  |

---

## H. Timeline Estimate

| Phase                   | Duration        | Dependencies |
| ----------------------- | --------------- | ------------ |
| Phase 1: Foundation     | 4-6 hours       | None         |
| Phase 2: Layout         | 6-8 hours       | Phase 1      |
| Phase 3: Dashboard      | 4-6 hours       | Phase 2      |
| Phase 4: Live Streaming | 3-4 hours       | Phase 2      |
| Phase 5: Routing        | 2-3 hours       | Phase 3, 4   |
| Phase 6: Polish         | 3-4 hours       | Phase 5      |
| **Total**               | **22-31 hours** |              |

---

## I. Notes & Assumptions

1. **React Router v6+** will be used (createBrowserRouter API)
2. **Existing components** (CCTVFeed, ActivityLog, StatsCard) will be reused without modification
3. **WebSocket hook** stays unchanged, used by both Dashboard and Live Streaming pages
4. **Auth flow** remains Supabase-based as currently implemented
5. **Placeholder pages** (ComingSoon) will be created for routes not yet implemented
6. **No breaking changes** to landing page or auth pages

---

## J. Next Steps

1. **Review and approve** this implementation plan
2. **Create a new branch** for the implementation (`feature/new-theme-sidebar`)
3. **Start with Phase 1** - Foundation (routing + theme updates)
4. **Iterative testing** after each phase completion

---

_Document created: 2026-01-29_
_Last updated: 2026-01-29_
_Author: UI/UX Designer Agent_
