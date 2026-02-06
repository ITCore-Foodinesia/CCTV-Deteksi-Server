# Dashboard Layout Design Specification

> **Document Version**: 1.0  
> **Last Updated**: February 2026  
> **Author**: UI/UX Designer Agent

---

## 📋 Executive Summary

Dokumen ini berisi evaluasi dan rekomendasi desain untuk layout dashboard GudangAI Monitor. Layout saat ini sudah cukup baik dengan struktur yang jelas, namun ada beberapa area yang bisa dioptimalkan untuk meningkatkan usability, scannability, dan user experience secara keseluruhan.

### Current State Assessment: **B+ (Good)**

| Aspect | Score | Notes |
|--------|-------|-------|
| Structure & Hierarchy | ⭐⭐⭐⭐ | Grid system baik, visual hierarchy jelas |
| Responsiveness | ⭐⭐⭐⭐ | Mobile-first approach sudah ada |
| Information Density | ⭐⭐⭐ | Bisa lebih efisien dengan data-dense layout |
| Time-to-Insight | ⭐⭐⭐ | User butuh ~10 detik untuk scan - target <5 detik |
| Real-time Feedback | ⭐⭐⭐⭐ | Live updates sudah ada |
| Accessibility | ⭐⭐⭐⭐ | Sudah diperbaiki di iteration sebelumnya |

---

## 🏗️ Current Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         TOP HEADER                               │
│  [≡]  GUDANG DRIVER    [Search...]    [🔔] [⚙️] [User Avatar]   │
└─────────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────────────┐
│              │                                                   │
│   SIDEBAR    │              MAIN CONTENT AREA                    │
│   (64px)     │                                                   │
│              │  ┌────────┬────────┬────────┬────────┐           │
│  • Dashboard │  │  KPI1  │  KPI2  │  KPI3  │  KPI4  │           │
│  • Cameras   │  └────────┴────────┴────────┴────────┘           │
│  • Sessions  │                                                   │
│  • Trucks    │  ┌────────────────────────┬───────────────┐      │
│  • Drivers   │  │                        │               │      │
│  • Helpers   │  │     DOCK STATUS        │  QUICK        │      │
│  • Loaders   │  │     (2/3 width)        │  ACTIONS      │      │
│  • Docks     │  │                        │  + ACTIVITY   │      │
│  ─────────── │  │                        │  + SUMMARY    │      │
│  • Analytics │  │                        │  (1/3 width)  │      │
│  • Reports   │  └────────────────────────┴───────────────┘      │
│  • Settings  │                                                   │
│              │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## 🎯 Recommended Layout Improvements

### 1. Hero KPI Bar (Command Center Style)

**Problem**: KPI cards terlihat rata - tidak ada prioritas visual.

**Solution**: Buat "Hero KPI" untuk metrik paling penting dengan visual yang lebih prominent.

```
┌────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │     🔥 ACTIVE NOW       │  │ Today   │ │ Avg Wait│ │Complete │
│  │                         │  │ ──────  │ │ ──────  │ │ ──────  │
│  │         12              │  │   28    │ │  15min  │ │  95%    │
│  │    Sessions Loading     │  │  Trucks │ │  Time   │ │  Rate   │
│  │    ▲ 3 from yesterday   │  └─────────┘ └─────────┘ └─────────┘
│  └─────────────────────────┘
└────────────────────────────────────────────────────────────────┘
```

**Implementation**:
```jsx
// Hero KPI (larger, primary focus)
<div className="col-span-2 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-3xl p-6 text-white">
  <div className="text-sm opacity-80 uppercase tracking-wider">Active Now</div>
  <div className="text-5xl font-black">12</div>
  <div className="text-sm opacity-80">Sessions Loading</div>
</div>

// Secondary KPIs (smaller, supporting)
<div className="grid grid-cols-3 gap-4">
  {secondaryKPIs.map(...)}
</div>
```

---

### 2. Dock Status - Visual Map View

**Problem**: Dock status sebagai cards tidak memberikan gambaran spatial.

**Solution**: Tambahkan toggle antara "List View" dan "Map View" untuk dock layout.

```
┌─────────────────────────────────────────────────────────────────┐
│  Dock Status                           [📋 List] [🗺️ Map]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   MAP VIEW (Toggle to show spatial layout)                       │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    WAREHOUSE FLOOR                       │   │
│   │                                                          │   │
│   │   [D1 ✓]  [D2 🚚]  [D3 🚚]  [D4 ⚠️]  [D5 ✓]  [D6 ✓]    │   │
│   │                                                          │   │
│   │   [D7 🚚]  [D8 ✓]  [D9 ✓]  [D10 🔧]  [D11 ✓]  [D12 ✓]   │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Legend: ✓ Available  🚚 Loading  ⚠️ Reserved  🔧 Maintenance   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Improved Information Hierarchy

**Current**: Semua informasi sama-sama prominent.

**Recommended**: Gunakan "Z-Pattern" untuk prioritas informasi.

```
┌────────────────────────────────────────────────────────────────┐
│  ZONE A (Primary Scan Zone)                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Hero KPIs - Numbers user needs to see in <3 seconds    │   │
│  └─────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│  ZONE B (Action Zone)                         ZONE C (Monitor) │
│  ┌───────────────────────────────┐  ┌─────────────────────┐   │
│  │                               │  │                      │   │
│  │    Dock Status (Actionable)   │  │   Activity Feed      │   │
│  │    - Click to manage          │  │   - Passive monitor  │   │
│  │    - Status at a glance       │  │   - Auto-updates     │   │
│  │                               │  │                      │   │
│  └───────────────────────────────┘  └─────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│  ZONE D (Secondary Actions)                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Quick Actions | Summary Stats | Alerts                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

### 4. Alert Banner System

**Problem**: Tidak ada sistem alert yang visible untuk urgent issues.

**Solution**: Tambahkan dismissible alert banner di atas KPI section.

```jsx
// Alert Banner Component
const AlertBanner = ({ alerts }) => {
  if (alerts.length === 0) return null;
  
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-xl">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            {alerts[0].message}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            {alerts[0].time}
          </p>
        </div>
        <button className="text-amber-600 hover:text-amber-800">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
```

---

### 5. Responsive Breakpoints Optimization

**Current Breakpoints**:
```
Mobile: < 640px (single column)
Tablet: 640px - 1024px (2 columns)
Desktop: > 1024px (full layout)
```

**Recommended Breakpoints**:
```
Mobile: < 640px (single column, stacked)
Tablet Portrait: 640px - 768px (2 columns, simplified sidebar)
Tablet Landscape: 768px - 1024px (3 columns, collapsible sidebar)
Desktop: 1024px - 1440px (full layout)
Desktop Large: > 1440px (expanded layout with more KPIs visible)
```

---

## 📐 Component Layout Specifications

### KPI Card - Standard

```
┌────────────────────────┐
│  Label (12px, gray)    │
│                        │
│  VALUE (30px, bold)    │
│                        │
│  ↗ Trend (12px, green) │
│                   [📊] │
└────────────────────────┘

Dimensions:
- Min Width: 160px
- Height: 100px
- Padding: 16px
- Border Radius: 16px (rounded-2xl)
- Shadow: shadow-sm
```

### KPI Card - Hero (Primary)

```
┌────────────────────────────────────────────┐
│  LABEL (14px, uppercase, tracking-wider)   │
│                                            │
│  VALUE (48px, font-black)                  │
│                                            │
│  Subtitle (14px, opacity-80)               │
│  ↗ +12% from yesterday (12px)              │
│                                            │
│  [🔗 View Details]                    [📊] │
└────────────────────────────────────────────┘

Dimensions:
- Width: 2 column span
- Height: 140px
- Padding: 24px
- Border Radius: 24px (rounded-3xl)
- Background: gradient (lime-500 → emerald-500)
```

### Dock Status Card

```
┌──────────────────────────────┐
│  D1 - LOADING BAY 1          │
│  ──────────────────────      │
│  Status: LOADING  [●]        │
│                              │
│  🚚 B 1234 XYZ               │
│  👤 Ahmad Supardi            │
│                              │
│  Started: 10:45 WIB          │
│  Est. Complete: 11:30 WIB    │
│                              │
│  [View Details]              │
└──────────────────────────────┘

Border Color by Status:
- Available: emerald-500
- Loading: orange-500
- Reserved: blue-500
- Maintenance: red-500
- Closed: gray-500
```

---

## 🎨 Design Tokens Reference

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon margins |
| `space-2` | 8px | Compact spacing |
| `space-3` | 12px | Between related elements |
| `space-4` | 16px | Card padding |
| `space-5` | 20px | Section padding |
| `space-6` | 24px | Major sections |
| `space-8` | 32px | Page margins |

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Small elements |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards |
| `radius-xl` | 16px | Major cards |
| `radius-2xl` | 24px | Hero sections |
| `radius-3xl` | 32px | Modal, sheets |

### Shadow Scale

| Token | Class | Usage |
|-------|-------|-------|
| `shadow-sm` | `shadow-sm` | Default cards |
| `shadow-md` | `shadow-md` | Elevated cards, hover |
| `shadow-lg` | `shadow-lg` | Modals, dropdowns |
| `shadow-xl` | `shadow-xl` | Floating elements |

---

## 📱 Responsive Layout Grid

### Desktop (≥1024px)

```
12-column grid
Sidebar: 256px fixed
Main content: fluid (calc(100% - 256px))
KPI Grid: 4 columns
Dock Grid: 2 columns
Activity: 1 column
```

### Tablet (768px - 1023px)

```
8-column grid
Sidebar: collapsible to 64px (icons only)
Main content: fluid
KPI Grid: 2 columns
Dock Grid: 2 columns (stacked below KPIs)
Activity: full width
```

### Mobile (<768px)

```
4-column grid
Sidebar: hidden (use drawer)
Main content: full width
KPI Grid: 1 column (swipeable carousel option)
Dock Grid: 1 column
Activity: full width
```

---

## 🔄 State Handling

### Loading States

```jsx
// Skeleton for KPI Card
<div className="animate-pulse rounded-2xl bg-gray-200 h-24" />

// Skeleton for Dock Card
<div className="animate-pulse rounded-2xl bg-gray-200 h-40" />
```

### Empty States

```jsx
// No Docks
<div className="text-center py-12">
  <Building2 className="mx-auto h-12 w-12 text-gray-300" />
  <h3 className="mt-4 text-sm font-medium text-gray-900">No docks configured</h3>
  <p className="mt-1 text-sm text-gray-500">Get started by adding your first dock.</p>
  <Button className="mt-4">Add Dock</Button>
</div>
```

### Error States

```jsx
// API Error
<div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
  <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
  <h3 className="mt-2 text-sm font-medium text-red-800">Failed to load data</h3>
  <p className="mt-1 text-sm text-red-600">{error.message}</p>
  <Button onClick={refetch} className="mt-4">Retry</Button>
</div>
```

---

## 📊 Implementation Checklist

### Phase 1: Quick Wins (1-2 days)

- [ ] Implement Hero KPI card untuk Active Sessions
- [ ] Add Alert Banner component
- [ ] Improve KPI card hover states
- [ ] Add loading skeletons yang lebih baik

### Phase 2: Layout Enhancements (3-5 days)

- [ ] Implement Dock Map View toggle
- [ ] Add Quick Summary widget di sidebar
- [ ] Implement responsive sidebar collapse
- [ ] Add swipeable KPI carousel untuk mobile

### Phase 3: Advanced Features (1-2 weeks)

- [ ] Real-time dock position updates
- [ ] Drag-and-drop dock assignment
- [ ] Customizable dashboard widgets
- [ ] Dashboard layout persistence (user preferences)

---

## 🔗 Related Documents

- [UI/UX Design Specification](./UI_UX_DESIGN_SPECIFICATION.md)
- [Component Library](./COMPONENT_LIBRARY.md)
- [Design Tokens](../dashboard/src/constants/theme.js)
- [Accessibility Guidelines](./A11Y_GUIDELINES.md)

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial layout specification |

