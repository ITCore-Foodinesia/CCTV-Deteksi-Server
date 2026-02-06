# 📐 UI/UX Design Specification
## Warehouse AI Dashboard - GudangAI Monitor

---

**Versi:** 1.0.0  
**Tanggal:** 4 Februari 2026  
**Author:** UI/UX Design Team  
**Status:** ✅ Active

---

## 📋 Daftar Isi

1. [Overview & Goals](#1-overview--goals)
2. [Design Principles](#2-design-principles)
3. [Design Tokens](#3-design-tokens)
4. [Information Architecture](#4-information-architecture)
5. [Page Inventory](#5-page-inventory)
6. [Component Library](#6-component-library)
7. [Interaction Patterns](#7-interaction-patterns)
8. [States Matrix](#8-states-matrix)
9. [Accessibility Guidelines](#9-accessibility-guidelines)
10. [Responsive Breakpoints](#10-responsive-breakpoints)
11. [Handoff Notes](#11-handoff-notes)

---

## 1. Overview & Goals

### 1.1 Product Description

**Warehouse AI Dashboard** (nama marketing: **GudangAI Monitor**) adalah platform SaaS enterprise untuk monitoring gudang berbasis kecerdasan buatan. Sistem mengintegrasikan live CCTV streaming dengan AI object detection untuk:

- Otomasi penghitungan barang masuk/keluar
- Pemantauan aktivitas truk di loading dock
- Dokumentasi operasional real-time
- Analytics dan reporting

### 1.2 Target Users

| Persona | Role | Primary Goals | Tech Savviness |
|---------|------|---------------|----------------|
| **Warehouse Manager** | Decision maker | Quick overview, alerts, reports | Medium |
| **Supervisor Operasional** | Day-to-day ops | Real-time monitoring, session management | Medium-High |
| **Admin/Staff Gudang** | Data entry, verification | Logging, editing, searching | Low-Medium |
| **Owner/Stakeholder** | Remote oversight | High-level analytics, transparency | Low |

### 1.3 Design Goals

| # | Goal | Success Metric |
|---|------|----------------|
| 1 | **Time-to-insight < 10 seconds** | User dapat memahami status gudang dalam 10 detik |
| 2 | **Task completion rate > 95%** | User berhasil menyelesaikan tugas utama |
| 3 | **Accessibility WCAG 2.1 AA** | Lulus automated accessibility audit |
| 4 | **Mobile-ready** | Responsive di semua breakpoints |
| 5 | **Low cognitive load** | SUS score > 80 |

---

## 2. Design Principles

### 2.1 Core Principles

```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN PRINCIPLES                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CLARITY FIRST                                           │
│     → Information hierarchy yang jelas                      │
│     → Prioritas visual: CCTV > Stats > Logs                 │
│     → Label dan icon yang self-explanatory                  │
│                                                             │
│  2. REAL-TIME FEEDBACK                                      │
│     → Semua data live ditandai dengan "pulse" indicator     │
│     → Connection status selalu visible                      │
│     → Timestamps update otomatis                            │
│                                                             │
│  3. PROFESSIONAL TRUST                                      │
│     → Visual clean, enterprise-grade                        │
│     → Consistent patterns across all pages                  │
│     → Data accuracy over flashy animations                  │
│                                                             │
│  4. ACCESSIBLE BY DEFAULT                                   │
│     → Keyboard navigable                                    │
│     → Screen reader friendly                                │
│     → High contrast ratios                                  │
│                                                             │
│  5. PROGRESSIVE COMPLEXITY                                  │
│     → Simple views for quick glance                         │
│     → Drill-down for power users                            │
│     → Advanced features discoverable, not overwhelming      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Visual Philosophy

**Theme Name:** Modern Industrial Glassmorphism

Kombinasi antara:
- **Industrial** - Nuansa warehouse, loading dock, forklift
- **Tech/AI** - Grid overlays, bounding boxes, data visualization
- **Modern SaaS** - Clean, spacious, professional

---

## 3. Design Tokens

### 3.1 Color Palette

#### Primary Colors

| Token Name | Hex | Tailwind | Usage |
|------------|-----|----------|-------|
| `--color-primary` | `#84CC16` | `lime-500` | Primary actions, active states, highlights |
| `--color-primary-light` | `#A3E635` | `lime-400` | Hover states, badges |
| `--color-primary-dark` | `#4D7C0F` | `lime-700` | Text on light backgrounds |

#### Background Colors

| Token Name | Hex | Tailwind | Usage |
|------------|-----|----------|-------|
| `--color-bg` | `#F5F7F2` | custom | Main app background |
| `--color-bg-light` | `#F9FAFB` | `gray-50` | Cards, sections |
| `--color-surface` | `rgba(255,255,255,0.7)` | custom | Glass cards |
| `--color-dark` | `#1A2E35` | custom | Dark elements, CCTV overlay |

#### Semantic Colors

| Token Name | Hex | Tailwind | Usage |
|------------|-----|----------|-------|
| `--color-success` | `#10B981` | `emerald-500` | Inbound, positive, online |
| `--color-danger` | `#F43F5E` | `rose-500` | Outbound, errors, offline |
| `--color-warning` | `#F59E0B` | `amber-500` | Capacity, warnings, loading |
| `--color-info` | `#3B82F6` | `blue-500` | Trucks, info panels |

#### Text Colors

| Token Name | Hex | Tailwind | Usage |
|------------|-----|----------|-------|
| `--color-text-primary` | `#0F172A` | `slate-900` | Headings, primary text |
| `--color-text-secondary` | `#64748B` | `slate-500` | Body text, descriptions |
| `--color-text-muted` | `#94A3B8` | `slate-400` | Placeholders, disabled |

#### Dock Status Colors

| Status | Border | Background | Text |
|--------|--------|------------|------|
| `available` | `emerald-500` | `emerald-50` | `emerald-900` |
| `loading` | `orange-500` | `orange-50` | `orange-900` |
| `maintenance` | `red-500` | `red-50` | `red-900` |
| `reserved` | `blue-500` | `blue-50` | `blue-900` |
| `closed` | `gray-500` | `gray-50` | `gray-900` |

### 3.2 Typography

#### Font Family

```css
/* Primary Font */
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

/* Monospace (for data, timestamps, stats) */
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

#### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--text-hero` | 60px (3.75rem) | 1.1 | 800 | Hero headline |
| `--text-h1` | 36px (2.25rem) | 1.2 | 700 | Page titles |
| `--text-h2` | 24px (1.5rem) | 1.3 | 600 | Section headers |
| `--text-h3` | 20px (1.25rem) | 1.4 | 600 | Card titles |
| `--text-body` | 16px (1rem) | 1.6 | 400 | Body text |
| `--text-sm` | 14px (0.875rem) | 1.5 | 400 | Secondary text |
| `--text-xs` | 12px (0.75rem) | 1.4 | 400 | Labels, captions |
| `--text-mono` | 12px (0.75rem) | 1.4 | 500 | Data, timestamps |

### 3.3 Spacing

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing, icon gaps |
| `--space-2` | 8px | Small padding, list gaps |
| `--space-3` | 12px | Medium padding |
| `--space-4` | 16px | Standard padding, card content |
| `--space-5` | 20px | Section spacing |
| `--space-6` | 24px | Large gaps |
| `--space-8` | 32px | Section breaks |
| `--space-10` | 40px | Page padding |
| `--space-12` | 48px | Major sections |
| `--space-16` | 64px | Hero sections |

### 3.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Badges, small elements |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Modal, large cards |
| `--radius-2xl` | 24px | Hero cards |
| `--radius-full` | 9999px | Pills, avatars |

### 3.5 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Dropdowns, modals |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Floating elements |
| `--shadow-lime` | `0 10px 15px -3px rgba(163,230,53,0.4)` | Primary CTA hover |

### 3.6 Glass Effect

```css
/* Standard Glass */
.glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

/* Card Glass */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
```

---

## 4. Information Architecture

### 4.1 Sitemap

```
GudangAI Monitor
│
├── 🏠 PUBLIC PAGES
│   ├── Landing Page (/)
│   ├── Login (/login)
│   ├── Sign Up (/signup)
│   └── Forgot Password (/forgot-password)
│
└── 🔐 DASHBOARD (Protected)
    │
    ├── MAIN
    │   ├── Overview (/dashboard/overview)
    │   └── Live Streaming (/dashboard/live-streaming)
    │
    ├── OPERASIONAL
    │   ├── Drivers (/dashboard/drivers)
    │   ├── Trucks (/dashboard/trucks)
    │   ├── Docks (/dashboard/docks)
    │   ├── Helpers (/dashboard/helpers)
    │   └── Loaders (/dashboard/loaders)
    │
    ├── AKTIVITAS
    │   ├── Loading Sessions (/dashboard/sessions)
    │   ├── History (/dashboard/history)
    │   └── Notifications (/dashboard/notifications)
    │
    ├── SISTEM
    │   ├── Cameras (/dashboard/cameras)
    │   ├── Users & Roles (/dashboard/users) [Owner only]
    │   └── Settings (/dashboard/settings) [Owner only]
    │
    └── LAPORAN
        ├── Reports (/dashboard/reports)
        └── Analytics (/dashboard/analytics)
```

### 4.2 Navigation Groups

| Group | Purpose | Target User |
|-------|---------|-------------|
| **MAIN** | Core monitoring features | All users |
| **OPERASIONAL** | Resource management | Supervisors, Admins |
| **AKTIVITAS** | Activity tracking | All users |
| **SISTEM** | Configuration & admin | Owner only |
| **LAPORAN** | Analytics & reporting | Managers, Owners |

### 4.3 User Flows

#### Primary Flow: Monitor Loading Session

```
[Dashboard Overview]
       ↓
[View Live Stream] → [See AI Detection]
       ↓
[Check Stats Cards] → [Inbound/Outbound counts]
       ↓
[View Activity Log] → [See recent sessions]
       ↓
[Click Session] → [Session Detail]
```

#### Secondary Flow: Manage Resources

```
[Sidebar: Operasional]
       ↓
[Select: Drivers/Trucks/etc]
       ↓
[View List] → [Search/Filter]
       ↓
[Click Item] → [Detail View]
       ↓
[Edit/Delete] → [Confirmation]
```

---

## 5. Page Inventory

### 5.1 Public Pages

#### 5.1.1 Landing Page (`/`)

**Purpose:** Marketing page untuk menarik signup

**Sections:**
| Section | Description |
|---------|-------------|
| **Navbar** | Logo, nav links, Login/Signup CTAs |
| **Hero** | Headline, subhead, CTAs, mini stats, fake dashboard visual |
| **Features** | 6 feature cards dengan icons |
| **How It Works** | 3-step process |
| **Pricing** | 3-tier pricing cards |
| **Testimonials** | Customer quotes carousel |
| **FAQ** | Accordion dengan 6-8 common questions |
| **CTA** | Final call-to-action banner |
| **Footer** | Links, social, copyright |

**Key Visual Elements:**
- Background blobs (lime + blue gradients)
- Glass effect cards
- Fake CCTV dashboard mockup dengan bounding boxes
- Animated stats (99.9% uptime, 50+ warehouses, 10k+ detections)

---

#### 5.1.2 Login Page (`/login`)

**Purpose:** User authentication

**Layout:** Split screen (visual left, form right)

**Form Fields:**
| Field | Type | Validation |
|-------|------|------------|
| Email | Text input | Required, valid email |
| Password | Password input | Required, min 8 chars |
| Remember Me | Checkbox | Optional |

**Actions:**
- Submit → Login
- "Forgot Password?" link
- "Sign up" link
- Google OAuth button

**States:** Default, Loading, Error, Success

---

#### 5.1.3 Sign Up Page (`/signup`)

**Purpose:** New user registration

**Form Fields:**
| Field | Type | Validation |
|-------|------|------------|
| Full Name | Text input | Required |
| Email | Text input | Required, valid email, unique |
| Password | Password input | Required, min 8 chars |
| Confirm Password | Password input | Must match |

**Actions:**
- Submit → Create account
- "Already have account?" link
- Google OAuth button

---

#### 5.1.4 Forgot Password (`/forgot-password`)

**Purpose:** Password recovery

**Flow:**
1. Enter email → Submit
2. Check email for link
3. Reset password form

---

### 5.2 Dashboard Pages

#### 5.2.1 Dashboard Overview (`/dashboard/overview`)

**Purpose:** Main monitoring hub - quick glance at all operations

**Layout Grid:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Header: Title + Actions]                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┬──────────┬──────────┬──────────┐              │
│  │ Inbound  │ Outbound │ Trucks   │ Capacity │  ← Stats     │
│  └──────────┴──────────┴──────────┴──────────┘              │
│                                                              │
│  ┌────────────────────────────┬─────────────────────────┐   │
│  │                            │                         │   │
│  │     CCTV Live Feed         │    Activity Log         │   │
│  │     (8 columns)            │    (4 columns)          │   │
│  │                            │                         │   │
│  │  [AI Detection Overlay]    │  [Real-time entries]    │   │
│  │  [Camera Switcher]         │  [Scrollable list]      │   │
│  │  [Fullscreen]              │                         │   │
│  │                            │                         │   │
│  └────────────────────────────┴─────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
| Component | Description |
|-----------|-------------|
| **StatsCard x4** | Inbound (emerald), Outbound (rose), Trucks (blue), Capacity (amber) |
| **CCTVFeed** | Live video stream dengan AI detection bounding boxes |
| **ActivityLog** | Real-time activity feed (inbound/outbound entries) |

**Real-time Elements:**
- WebSocket connection status
- Auto-updating stats
- New activity animations
- Live badge pulse

---

#### 5.2.2 Live Streaming (`/dashboard/live-streaming`)

**Purpose:** Full-screen CCTV monitoring

**Layout:**
- Multi-camera grid (1x1, 2x2, 3x3 options)
- Camera selector dropdown
- Full-screen toggle
- Recording controls (if enabled)

**AI Overlay:**
- Bounding boxes: Person (lime), Truck (blue), Box (amber)
- Confidence percentage labels
- Object count summary

---

#### 5.2.3 Drivers Page (`/dashboard/drivers`)

**Purpose:** Manage driver data

**Features:**
| Feature | Description |
|---------|-------------|
| **Data Table** | List all drivers dengan columns: Name, Phone, License, Status |
| **Search** | Filter by name, phone |
| **Add Driver** | Modal form |
| **Edit/Delete** | Row actions |

**Table Columns:**
- Photo (avatar)
- Name
- Phone Number
- License Number
- Status (Active/Inactive)
- Actions (Edit, Delete)

---

#### 5.2.4 Trucks Page (`/dashboard/trucks`)

**Purpose:** Vehicle management

**Table Columns:**
- Plate Number
- Model/Type
- Driver (linked)
- Status
- Last Active
- Actions

---

#### 5.2.5 Docks Page (`/dashboard/docks`)

**Purpose:** Loading dock management

**Layout:** Grid of dock cards

**Dock Card Content:**
- Dock Name (e.g., "Dock A-1")
- Status badge (Available, Loading, Maintenance, Reserved, Closed)
- Current truck (if loading)
- Queue count

**Actions:**
- Change status
- View history
- Edit dock details

---

#### 5.2.6 Helpers Page (`/dashboard/helpers`)

**Purpose:** Helper/assistant worker management

**Similar to Drivers page**

---

#### 5.2.7 Loaders Page (`/dashboard/loaders`)

**Purpose:** Loader worker management

**Similar to Drivers page**

---

#### 5.2.8 Loading Sessions (`/dashboard/sessions`)

**Purpose:** Track active and recent loading sessions

**View Options:**
- Active Sessions (cards/grid)
- All Sessions (table)

**Session Card Content:**
- Session ID
- Truck info
- Driver name
- Start time
- Duration
- Inbound/Outbound count
- Status (Active, Completed, Paused)

**Detail View:**
- Timeline of activities
- Photos/snapshots
- Count breakdown
- Notes

---

#### 5.2.9 History Page (`/dashboard/history`)

**Purpose:** Historical data browse

**Features:**
- Date range picker
- Filter by truck/driver/dock
- Exportable
- Paginated table

---

#### 5.2.10 Notifications (`/dashboard/notifications`)

**Purpose:** System alerts and notifications

**Notification Types:**
| Type | Icon | Color |
|------|------|-------|
| Session Started | Play | Blue |
| Session Completed | Check | Green |
| Alert/Warning | AlertTriangle | Amber |
| Error | XCircle | Red |
| Info | Info | Gray |

**Features:**
- Mark as read
- Mark all as read
- Delete
- Filter by type

---

#### 5.2.11 Cameras Page (`/dashboard/cameras`)

**Purpose:** Camera configuration

**Camera Card Content:**
- Camera name
- RTSP URL (masked)
- Status (Online/Offline)
- Preview thumbnail
- Resolution info

**Actions:**
- Add camera
- Edit connection
- Test connection
- Delete

---

#### 5.2.12 Users & Roles (`/dashboard/users`)

**Purpose:** User management (Owner only)

**Table Columns:**
- Avatar
- Name
- Email
- Role
- Status
- Last Login
- Actions

**Roles:**
- Owner (full access)
- Manager (all except settings)
- Operator (operational + view)
- Viewer (read-only)

---

#### 5.2.13 Settings (`/dashboard/settings`)

**Purpose:** System configuration (Owner only)

**Sections:**
- Tenant/Company Info
- Integration Settings (Google Sheets, Telegram)
- Notification Preferences
- AI Detection Settings
- Danger Zone (delete tenant)

---

#### 5.2.14 Reports (`/dashboard/reports`)

**Purpose:** Generate and download reports

**Report Types:**
- Daily Summary
- Weekly Summary
- Monthly Summary
- Custom Date Range

**Format:**
- View on screen
- Export PDF
- Export Excel

---

#### 5.2.15 Analytics (`/dashboard/analytics`)

**Purpose:** Data visualization and trends

**Charts:**
- Line chart: Daily in/out over time
- Bar chart: By dock comparison
- Pie chart: Status distribution
- Heatmap: Activity by hour

---

## 6. Component Library

### 6.1 Buttons

| Variant | Usage | Tailwind Classes |
|---------|-------|------------------|
| **Primary** | Main actions | `bg-[#a3e635] hover:bg-[#84cc16] text-gray-900 font-bold rounded-xl px-6 py-3` |
| **Secondary** | Alternative actions | `bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-6 py-3` |
| **Outline** | Tertiary actions | `border border-lime-400 text-lime-700 hover:bg-lime-50 rounded-xl px-6 py-3` |
| **Ghost** | Minimal actions | `text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-4 py-2` |
| **Danger** | Destructive actions | `bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-3` |
| **Icon** | Icon-only | `p-2 rounded-lg hover:bg-gray-100` |

**States:**
- Default
- Hover
- Active/Pressed
- Disabled
- Loading (with spinner)

### 6.2 Input Fields

| Type | Description |
|------|-------------|
| **Text Input** | Standard text field |
| **Password** | With show/hide toggle |
| **Select** | Dropdown |
| **Search** | With search icon |
| **Textarea** | Multi-line |
| **Checkbox** | With label |
| **Radio** | With label |
| **Toggle** | On/off switch |

**Input States:**
- Default
- Focus (lime ring)
- Error (red border + message)
- Disabled
- Read-only

**Standard Input Classes:**
```
w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 
focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/50 
focus:outline-none transition-all placeholder-gray-400 text-gray-800
```

### 6.3 Cards

| Variant | Usage |
|---------|-------|
| **Glass Card** | Standard content container |
| **Stats Card** | Metric display with icon and badge |
| **Dock Card** | Dock status display |
| **Session Card** | Active session display |
| **User Card** | Avatar + info |

**Glass Card Base:**
```
bg-white/70 backdrop-blur-lg border border-white/50 
shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl p-4
```

### 6.4 Navigation

| Component | Description |
|-----------|-------------|
| **Sidebar** | Left navigation (desktop) |
| **TopHeader** | Top bar with breadcrumb, search, user |
| **MobileDrawer** | Slide-out menu (mobile) |
| **Navbar** | Landing page navigation |

### 6.5 Feedback

| Component | Usage |
|-----------|-------|
| **Badge** | Status indicators, counts |
| **Toast** | Temporary notifications |
| **Alert** | Inline messages |
| **Modal** | Dialogs, confirmations |
| **Skeleton** | Loading placeholders |
| **Spinner** | Loading indicator |
| **Progress** | Progress bar |

### 6.6 Data Display

| Component | Usage |
|-----------|-------|
| **Table** | Data lists |
| **DataGrid** | Complex tables with sorting/filtering |
| **Avatar** | User photos |
| **Badge** | Status labels |
| **Timestamp** | Formatted dates/times |

---

## 7. Interaction Patterns

### 7.1 Loading States

| Context | Pattern |
|---------|---------|
| **Page Load** | Full page skeleton |
| **Section Load** | Section skeleton |
| **Button Action** | Spinner inside button, disable |
| **Table Load** | Row skeletons |
| **Infinite Scroll** | Bottom spinner |

### 7.2 Error Handling

| Error Type | UI Response |
|------------|-------------|
| **Form Validation** | Inline red message below field |
| **API Error** | Toast notification (top-right) |
| **Network Error** | Full-page error with retry button |
| **404** | Illustrated empty state |
| **Permission Denied** | Toast + redirect |

### 7.3 Real-time Updates

| Update Type | Animation |
|-------------|-----------|
| **New Activity** | Slide in from top + highlight fade |
| **Stats Update** | Number counter animation |
| **Status Change** | Badge color transition |
| **Connection Lost** | Header status bar turns red |

### 7.4 Confirmations

| Action | Confirmation Type |
|--------|-------------------|
| **Delete** | Modal with "Type to confirm" |
| **Logout** | Simple modal |
| **Cancel Editing** | Simple modal if unsaved |
| **Destructive Settings** | Double confirmation |

### 7.5 Navigation

| Pattern | Behavior |
|---------|----------|
| **Sidebar Click** | Immediate navigation, active state |
| **Breadcrumb** | Navigate to parent |
| **Back Button** | Browser history back |
| **Deep Link** | Direct URL access (auth check first) |

---

## 8. States Matrix

### 8.1 Page States

| Page | Loading | Empty | Error | Populated |
|------|---------|-------|-------|-----------|
| Dashboard | Skeleton cards + feed | N/A (always has stats) | API error toast | Normal |
| Drivers | Table skeleton | Illustrated empty + CTA | Error banner | Table |
| Sessions | Card skeletons | "No active sessions" | Error toast | Grid/Table |
| Notifications | List skeleton | "All caught up" | Error toast | List |
| Settings | Form skeleton | N/A | Error banner | Forms |

### 8.2 Component States

**StatsCard:**
- Loading: Number skeleton
- Live: Pulse indicator
- Stale: Warning icon

**CCTVFeed:**
- Loading: Shimmer placeholder
- Streaming: Live badge + video
- Offline: "Camera Offline" overlay
- Error: "Connection Error" + retry

**ActivityLog:**
- Loading: Row skeletons
- Empty: "No recent activity"
- Populated: Scrollable list
- New item: Highlight animation

**DataTable:**
- Loading: Row skeletons
- Empty: Illustrated + CTA
- Filtered empty: "No results" + clear filter
- Populated: Paginated rows

---

## 9. Accessibility Guidelines

### 9.1 WCAG 2.1 AA Compliance

| Criteria | Requirement | Implementation |
|----------|-------------|----------------|
| **1.4.3 Contrast** | Min 4.5:1 for text | All text passes contrast check |
| **2.1.1 Keyboard** | All functionality via keyboard | Tab order, focus visible |
| **2.4.4 Link Purpose** | Clear link text | Descriptive labels |
| **3.3.2 Labels** | All inputs labeled | Associated labels |
| **4.1.2 Name, Role, Value** | ARIA when needed | Semantic HTML first |

### 9.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous |
| `Enter` | Activate button/link |
| `Space` | Toggle checkbox, activate button |
| `Escape` | Close modal/dropdown |
| `Arrow Keys` | Navigate within component |

### 9.3 Focus States

```css
/* Focus visible ring */
.focus-visible-ring {
  @apply focus-visible:outline-none 
         focus-visible:ring-2 
         focus-visible:ring-[#a3e635] 
         focus-visible:ring-offset-2;
}
```

### 9.4 Screen Reader Considerations

- Use semantic HTML (`<nav>`, `<main>`, `<article>`, `<button>`)
- ARIA labels for icon-only buttons
- Live regions for real-time updates (`aria-live="polite"`)
- Skip links for main content

### 9.5 Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Responsive Breakpoints

### 10.1 Breakpoints

| Name | Width | Tailwind | Usage |
|------|-------|----------|-------|
| **Mobile** | 0-639px | default | Single column, drawer nav |
| **Tablet** | 640-1023px | `sm:` | 2 columns, drawer nav |
| **Desktop** | 1024-1279px | `lg:` | Sidebar visible, 3 columns |
| **Large** | 1280px+ | `xl:` | Full layout, 4 columns |

### 10.2 Layout Adaptations

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| **Navigation** | Hamburger + Drawer | Hamburger + Drawer | Sidebar |
| **Stats Cards** | 2x2 grid | 4 in row | 4 in row |
| **CCTV + Log** | Stacked | Stacked | Side by side (8+4) |
| **Tables** | Horizontal scroll | Horizontal scroll | Full width |
| **Modals** | Full screen | Centered | Centered |

### 10.3 Touch Targets

- Minimum touch target: 44x44px
- Button padding adequate for finger taps
- Spacing between interactive elements: min 8px

---

## 11. Handoff Notes

### 11.1 CSS Framework

- **Tailwind CSS 3.x** with custom configuration
- Custom utilities in `index.css`
- Theme constants in `constants/theme.js`

### 11.2 Icon Library

- **Lucide React** (outline style, consistent 24px stroke)
- Import: `import { IconName } from 'lucide-react'`

### 11.3 Animation Library

- CSS animations (defined in tailwind.config.js and index.css)
- No heavy animation libraries

### 11.4 Component Structure

```
src/
├── components/
│   ├── auth/           # Login, Signup, etc.
│   ├── landing/        # Landing page sections
│   ├── layout/         # Shell, Sidebar, Header
│   ├── shared/         # Reusable components
│   └── ui/             # Basic UI components
├── constants/
│   ├── navigation.js   # Sidebar menu config
│   └── theme.js        # Design tokens
├── pages/              # Route pages
├── hooks/              # Custom hooks
└── contexts/           # React contexts
```

### 11.5 Implementation Priority

| Phase | Pages/Components |
|-------|------------------|
| **P0 - Core** | Login, Dashboard Overview, Live Streaming |
| **P1 - Operations** | Drivers, Trucks, Docks, Sessions |
| **P2 - Activity** | History, Notifications, Cameras |
| **P3 - Admin** | Users, Settings, Analytics, Reports |

### 11.6 Acceptance Criteria Template

```
Feature: [Feature Name]

Scenario: [User action]
  Given [precondition]
  When [action]
  Then [expected result]
  And [additional checks]
```

---

## 📎 Appendix

### A. File References

| File | Purpose |
|------|---------|
| [`tailwind.config.js`](../dashboard/tailwind.config.js) | Tailwind configuration |
| [`index.css`](../dashboard/src/index.css) | Global CSS + utilities |
| [`theme.js`](../dashboard/src/constants/theme.js) | Design tokens |
| [`navigation.js`](../dashboard/src/constants/navigation.js) | Navigation config |

### B. Design Tools

- **Figma** - Mockups and prototypes
- **Lucide Icons** - https://lucide.dev
- **Tailwind CSS** - https://tailwindcss.com

### C. References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Document Version:** 1.0.0  
**Last Updated:** 4 Februari 2026  
**Next Review:** After Phase 1 implementation
