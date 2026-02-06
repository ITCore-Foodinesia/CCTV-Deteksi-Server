# Front-End Issue Tracker - Complete Inventory

**Last Updated:** 6 Februari 2026 (Verified)  
**Total Issues:** 59  
**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Summary

| Category | Total | Done | Pending |
|----------|-------|------|---------|
| Project Setup | 5 | 5 | 0 |
| Layout & Shell | 6 | 5 | 1 |
| Data Integration Hooks | 14 | 11 | 3 |
| Feature Implementation | 12 | 1 | 11 |
| Bug Fixes & Critical | 5 | 2 | 3 |
| Accessibility | 6 | 4 | 2 |
| UI/UX Improvements | 8 | 3 | 5 |
| Testing & Quality | 3 | 0 | 3 |
| **TOTAL** | **59** | **31** | **28** |

---

## Section A: Project Setup (5) ✅

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | Setup Vite + React project | ✅ Done | - | [`dashboard/package.json`](../../dashboard/package.json), [`dashboard/vite.config.js`](../../dashboard/vite.config.js) |
| 2 | Configure Tailwind CSS | ✅ Done | - | [`dashboard/tailwind.config.js`](../../dashboard/tailwind.config.js), [`dashboard/postcss.config.js`](../../dashboard/postcss.config.js) |
| 3 | Setup ESLint configuration | ✅ Done | - | [`dashboard/eslint.config.js`](../../dashboard/eslint.config.js) |
| 4 | Configure Supabase client | ✅ Done | - | [`dashboard/src/lib/supabase.js`](../../dashboard/src/lib/supabase.js) |
| 5 | Setup React Router routing | ✅ Done | - | [`dashboard/src/routes/index.jsx`](../../dashboard/src/routes/index.jsx), [`dashboard/src/routes/ProtectedRoute.jsx`](../../dashboard/src/routes/ProtectedRoute.jsx) |

---

## Section B: Layout & Shell (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 6 | Build Sidebar component | ✅ Done | - | [`dashboard/src/layouts/Sidebar.jsx`](../../dashboard/src/layouts/Sidebar.jsx) |
| 7 | Build TopHeader component | ✅ Done | - | [`dashboard/src/layouts/TopHeader.jsx`](../../dashboard/src/layouts/TopHeader.jsx) |
| 8 | Build MobileDrawer component | ✅ Done | - | [`dashboard/src/layouts/MobileDrawer.jsx`](../../dashboard/src/layouts/MobileDrawer.jsx) |
| 9 | Build DashboardShell/DashboardLayout | ✅ Done | - | [`dashboard/src/layouts/DashboardLayout.jsx`](../../dashboard/src/layouts/DashboardLayout.jsx) |
| 10 | Create navigation config structure | ✅ Done | - | [`dashboard/src/constants/navigation.js`](../../dashboard/src/constants/navigation.js) |
| 11 | Consolidate duplicate dashboard layouts (DashboardOverview vs WarehouseAIDashboard) | ⏳ Pending | 🔴 Critical | Two different layouts causing maintenance issues |

---

## Section C: Data Integration Hooks (14)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 12 | Build `useSupabaseTable.js` - generic hook | ✅ Done | - | [`dashboard/src/hooks/useSupabaseTable.js`](../../dashboard/src/hooks/useSupabaseTable.js) |
| 13 | Build `useDrivers.js` hook | ✅ Done | - | [`dashboard/src/hooks/useDrivers.js`](../../dashboard/src/hooks/useDrivers.js) |
| 14 | Build `useTrucks.js` hook | ✅ Done | - | [`dashboard/src/hooks/useTrucks.js`](../../dashboard/src/hooks/useTrucks.js) |
| 15 | Build `useDocks.js` hook | ✅ Done | - | [`dashboard/src/hooks/useDocks.js`](../../dashboard/src/hooks/useDocks.js) |
| 16 | Build `useSessions.js` hook | ✅ Done | - | [`dashboard/src/hooks/useSessions.js`](../../dashboard/src/hooks/useSessions.js) |
| 17 | Build `useHelpers.js` hook | ✅ Done | - | [`dashboard/src/hooks/useHelpers.js`](../../dashboard/src/hooks/useHelpers.js) |
| 18 | Build `useLoaders.js` hook | ✅ Done | - | [`dashboard/src/hooks/useLoaders.js`](../../dashboard/src/hooks/useLoaders.js) |
| 19 | Build `useCameras.js` hook | ✅ Done | - | [`dashboard/src/hooks/useCameras.js`](../../dashboard/src/hooks/useCameras.js) |
| 20 | Build `useAnalytics.js` hook | ✅ Done | - | [`dashboard/src/hooks/useAnalytics.js`](../../dashboard/src/hooks/useAnalytics.js) |
| 21 | Build `useDashboardStats.js` hook | ✅ Done | - | [`dashboard/src/hooks/useDashboardStats.js`](../../dashboard/src/hooks/useDashboardStats.js) |
| 22 | Build `useNotifications.js` hook | ✅ Done | - | [`dashboard/src/hooks/useNotifications.js`](../../dashboard/src/hooks/useNotifications.js) |
| 23 | Replace mock data with Supabase on DriversPage | ⏳ Pending | 🟡 Medium | Wire `useDrivers()` to `DriversPage.jsx` |
| 24 | Replace mock data with Supabase on operational pages (Trucks, Docks, Helpers, Loaders, Sessions) | ⏳ Pending | 🟡 Medium | Wire all hooks to respective pages |
| 25 | Aggregate Dashboard Overview stats from hooks | ⏳ Pending | 🟡 Medium | Use `useDashboardStats()` in DashboardOverview |

---

## Section D: Feature Implementation (12)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 26 | Integrate real-time dashboard data (WebSocket + live UI updates) | ✅ Done | - | `useWebSocket.js` fully implemented with Socket.io |
| 27 | Integrate real CCTV feed + detection overlays + camera switching | ⏳ Pending | 🔴 High | Connect to Python detection engine |
| 28 | Add historical analytics charts on dashboard | ⏳ Pending | 🟡 Medium | Charts for AnalyticsPage |
| 29 | Add report export from UI (PDF/Excel) | ⏳ Pending | 🟡 Medium | ReportsPage export functionality |
| 30 | Build alert/notification system in UI | ⏳ Pending | 🟡 Medium | Toast + notification panel integration |
| 31 | Support multi-warehouse UI flows | ⏳ Pending | 🟡 Medium | Tenant switching, multi-warehouse selection |
| 32 | Add role/permission UI (RBAC) | ⏳ Pending | 🟡 Medium | UsersPage role management |
| 33 | Add dark mode toggle in UI | ⏳ Pending | 🟢 Low | Theme toggle in settings/header |
| 34 | Add i18n structure (multi-language support) | ⏳ Pending | 🟢 Low | Extract strings, setup i18n library |
| 35 | Build Dashboard Overview UI blocks (KPI cards, dock grid, quick actions, activity feed) | ⏳ Pending | 🟡 Medium | Complete dashboard redesign |
| 36 | Refactor Live Streaming page (layout cleanup + verify CCTV works) | ⏳ Pending | 🟡 Medium | Clean up LiveStreamingPage |
| 37 | Wire up routing/navigation + test mobile drawer | ⏳ Pending | 🟡 Medium | End-to-end navigation testing |

---

## Section E: Bug Fixes & Critical (5)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 38 | Fix dynamic Tailwind classes in ActivityLog | ✅ Done | - | `COLOR_CLASSES` mapping implemented in [`ActivityLog.jsx`](../../dashboard/src/components/ActivityLog.jsx:9) |
| 39 | Fix StatsCard `iconColor.replace()` anti-pattern | ✅ Done | - | `ICON_TO_VALUE_COLOR` mapping in [`StatsCard.jsx`](../../dashboard/src/components/StatsCard.jsx:8) |
| 40 | Add global ErrorBoundary component | ✅ Done | - | Full implementation in [`ErrorBoundary.jsx`](../../dashboard/src/components/shared/ErrorBoundary.jsx) |
| 41 | Add loading/error states to WarehouseAIDashboard | ⏳ Pending | 🔴 High | No global loading indicator currently |
| 42 | Remove debug console.logs from WarehouseAIDashboard | ⏳ Pending | 🟢 Low | Line 102-109 has console pollution |

---

## Section F: Accessibility (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 43 | Add keyboard navigation to Sidebar and Dropdowns | ✅ Done | - | `focus-visible:ring-2` in [`Sidebar.jsx`](../../dashboard/src/layouts/Sidebar.jsx:76) |
| 44 | Add ARIA labels to all interactive elements | ✅ Done | - | Proper ARIA in Sidebar, StatsCard, ActivityLog, ErrorBoundary |
| 45 | Add focus-visible states to all focusable elements | ✅ Done | - | `focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2` |
| 46 | Fix minimum font size (9px too small in StatsCard compact) | ⏳ Pending | 🟡 Medium | Min 12px for accessibility |
| 47 | Add aria-live regions for dynamic content (stats, activity log) | ✅ Done | - | `aria-live="polite"` in [`StatsCard.jsx`](../../dashboard/src/components/StatsCard.jsx:89), [`ActivityLog.jsx`](../../dashboard/src/components/ActivityLog.jsx:145) |
| 48 | Add screen reader support for notification count | ⏳ Pending | 🟡 Medium | Announce unread count changes |

---

## Section G: UI/UX Improvements (8)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 49 | Add empty state for ActivityLog when logs empty | ✅ Done | - | `EmptyState` component in [`ActivityLog.jsx`](../../dashboard/src/components/ActivityLog.jsx:24) |
| 50 | Improve CCTV error messaging with troubleshooting steps | ⏳ Pending | 🟡 Medium | More specific error messages |
| 51 | Add keyboard shortcut (F key) for CCTV fullscreen | ⏳ Pending | 🟢 Low | Power user feature |
| 52 | Improve "Coming Soon" label placement in Sidebar | ⏳ Pending | 🟢 Low | Currently awkward positioning |
| 53 | Make real-time indicator more prominent in Dashboard | ⏳ Pending | 🟢 Low | Live pulse needs to be more visible |
| 54 | Replace emoji logo (🏭) with proper SVG logo | ✅ Done | - | `BrandLogo` uses Warehouse icon in [`Sidebar.jsx`](../../dashboard/src/layouts/Sidebar.jsx:30) |
| 55 | Standardize border-radius tokens | ⏳ Pending | 🟢 Low | Mixed xl/2xl/1.5rem usage |
| 56 | Add avatar fallback when DiceBear API fails | ✅ Done | - | `DriverAvatar` with initials fallback in [`ActivityLog.jsx`](../../dashboard/src/components/ActivityLog.jsx:42) |

---

## Section H: Testing & Quality (3)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 57 | Add unit tests for critical components (Jest + RTL) | ⏳ Pending | 🔴 High | Priority: StatsCard, CCTVFeed, ActivityLog |
| 58 | Add Storybook documentation for components | ⏳ Pending | 🟢 Low | Component library documentation |
| 59 | Run Lighthouse performance audit | ⏳ Pending | 🟡 Medium | Identify performance bottlenecks |

---

## Optional: Layout Option 2 (if chosen)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| O1 | Build nav rail (collapsed sidebar) | ⏳ Pending | 🟢 Low | Alternative layout |
| O2 | Create RightSidebar intel feed | ⏳ Pending | 🟢 Low | Alternative layout |
| O3 | Build DockVisualCard with CCTV thumbnail | ⏳ Pending | 🟢 Low | Alternative layout |

---

## Sources

This inventory was compiled from:
- [`dashboard/IMPLEMENTATION.md`](../../dashboard/IMPLEMENTATION.md)
- [`docs/dashboard-implementation/RENCANA_IMPLEMENTASI_DASHBOARD_SUPABASE.md`](../dashboard-implementation/RENCANA_IMPLEMENTASI_DASHBOARD_SUPABASE.md)
- [`docs/UI_UX_DESIGN_SPECIFICATION.md`](../UI_UX_DESIGN_SPECIFICATION.md)
- [`docs/ui-ux-analysis/DASHBOARD_UI_UX_ANALYSIS.md`](../ui-ux-analysis/DASHBOARD_UI_UX_ANALYSIS.md)
- [`docs/laporan-per-role/01_Frontend_Developer.md`](../laporan-per-role/01_Frontend_Developer.md)
- Codebase analysis of existing hooks and components

---

## GitHub Projects Labels

Recommended labels for these issues:
- `frontend`
- `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
- `type:bug` / `type:feature` / `type:enhancement`
- `a11y` (accessibility)
- `dx` (developer experience)
- `status:done` / `status:in-progress` / `status:pending`
