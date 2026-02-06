# Dashboard Layout Design Specification (Option 3)

> **Concept Name**: "The Dispatcher" (Exception-Driven Workboard)  
> **Document Version**: 1.0  
> **Target Audience**: Shift Supervisor / Dispatcher / Ops Lead  
> **Philosophy**: *What needs action now?* (prioritize decisions over dashboards)

---

## 1) Executive Summary

Option 3 is a layout recommendation built for **operational flow control**: triaging alerts, managing queues, and resolving exceptions quickly. It sits between:
- **Option 1** (Management / KPI-first) and
- **Option 2** (Visual monitoring / CCTV-first).

**When to use Option 3:**
- Your primary user is responsible for **keeping operations moving** (assign dock, resolve blockers, handle escalations).
- You want **time-to-action** to be < 10 seconds.

---

## 2) Core Jobs-To-Be-Done (JTBD)

1. **Triage:** “Show me what is blocking operations right now.”
2. **Decide:** “Which session/truck should be handled next?”
3. **Act:** “Assign dock / acknowledge alert / start loading / report issue.”
4. **Verify:** “What changed after I did that?” (feedback loop + audit trail)

---

## 3) Layout Overview (3-Pane Workboard)

### High-level structure

- **Top Bar (global context)**: shift, facility/tenant, system health
- **Left Pane (Work Queue)**: prioritized list of alerts + waiting sessions
- **Center Pane (Operations Board)**: dock/session board grouped by status
- **Right Pane (Details + Actions)**: the selected item’s context + one-click actions

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Facility ▾  Shift ▾  Search  |  🟢 Online  🔔 Alerts(3)  User ▾      │
└──────────────────────────────────────────────────────────────────────────────┘
┌───────────────────┬───────────────────────────────────────┬─────────────────┐
│ LEFT: WORK QUEUE  │ CENTER: OPERATIONS BOARD              │ RIGHT: DETAILS  │
│ (Prioritized)     │ (Status Columns / Board)              │ (Context+Action)│
│                   │                                       │                 │
│ 🚨 Alerts (must)  │  ┌──────────┬──────────┬──────────┐   │  Selected Item  │
│  - Safety (2)     │  │ Waiting  │ Loading  │ Problem  │   │  ┌────────────┐ │
│  - Unknown plate  │  │  (3)     │  (4)     │  (1)     │   │  │ CCTV Preview│ │
│                   │  ├──────────┼──────────┼──────────┤   │  └────────────┘ │
│ ⏳ Queue           │  │ Card     │ Card     │ Card     │   │  Timeline        │
│  - Truck A (ETA)  │  │ Card     │ Card     │          │   │  - Event…         │
│  - Truck B (SLA)  │  └──────────┴──────────┴──────────┘   │                 │
│                   │                                       │  Actions         │
│ Filters           │ Quick Stats Strip (optional)          │  [Acknowledge]   │
│ Status ▾ Priority │                                       │  [Assign Dock]   │
│ Dock ▾ Driver ▾   │                                       │  [Report Issue]  │
└───────────────────┴───────────────────────────────────────┴─────────────────┘
```

---

## 4) Why This Layout Works (UX Rationale)

### A) Faster time-to-action
- User can **scan left** (urgent queue) → **act right** (actions) without hunting through pages.

### B) Reduced cognitive load
- **Queue (what’s next)** is separated from **Board (what’s happening)**.

### C) Better accountability
- Right panel includes **timeline/audit trail**, so ops can explain decisions.

---

## 5) Key Components (Design Spec)

### 5.1 Left Pane — Work Queue
**Purpose:** show prioritized work items.

**Sections:**
1. **Alerts (sticky)** – must acknowledge
2. **Waiting Queue** – sessions/trucks not started
3. **Overdue / SLA risk** – time-based escalation

**Queue item fields (minimum):**
- Title (Truck / Dock / Camera)
- Severity (Critical/High/Med/Low)
- Age / SLA timer (“12m”, “Overdue 3m”)
- Suggested action (“Assign dock”, “Verify plate”, “Acknowledge”) 

**Interaction:**
- Click item → populates right details panel
- Keyboard: ↑/↓ to navigate queue, Enter to open actions

---

### 5.2 Center Pane — Operations Board
**Purpose:** maintain “single view of current operations”.

**Board columns (recommend):**
- **Waiting** (not started)
- **Loading**
- **Unloading**
- **Problem / Blocked**
- **Done** (collapsed by default)

**Each card shows:**
- Dock code + status
- Truck plate + driver
- Progress bar (time elapsed vs expected)
- Confidence indicator if AI detection present

**Quick actions on card (icon buttons):**
- Open details
- Mark as problem
- Assign / reassign

---

### 5.3 Right Pane — Details + Actions
**Purpose:** reduce navigation + allow immediate resolution.

**Stacked sections:**
1. **Header:** title + status + severity
2. **CCTV Preview:** small embedded preview (optional)
3. **Timeline:** events with timestamps
4. **Actions:** primary action buttons

**Primary actions (contextual):**
- **Acknowledge** (alerts)
- **Assign Dock** (queue items)
- **Start Loading/Unloading**
- **Escalate / Report Issue**

---

## 6) Information Hierarchy (What’s Above the Fold)

**Above the fold target (first 5 seconds):**
1. Count of critical alerts
2. Count of waiting trucks / sessions
3. Any blocked dock
4. Selected item’s next action

**Rule:** if user cannot identify “next thing to do” within 10 seconds, layout failed.

---

## 7) Visual Theme (Option 3)

### Theme Name: "Industrial Minimal — Light Mode" 
**Why:** Workboard is dense; light mode improves readability for text-heavy lists.

**Palette guidance:**
- Background: off-white / gray-50
- Cards: white + subtle border
- Accent: Lime for primary actions
- Severity colors: Red/Amber/Blue/Gray (do not rely on color only)

**Badges must include text** (e.g., “Critical”, not just red dot).

---

## 8) Accessibility Requirements (Non-negotiable)

- All interactive elements have visible focus
- Queue and Board are keyboard-navigable
- Alerts use `aria-live="polite"` for new events
- Color + icon + text for severity/status
- Provide reduced-motion option for live updates

---

## 9) State Matrix (Loading / Empty / Error)

### Loading
- Skeleton for queue items
- Skeleton for board cards

### Empty
- “No alerts” state (celebratory but calm)
- “No queue” state (show next recommended action)

### Error
- Show what failed (alerts? board? details?)
- Provide retry per panel (not only global)

---

## 10) Measurement Plan (What to Track)

**Primary metrics (Ops):**
- Time to acknowledge alert (TTA)
- Time to resolve exception (TTR)
- Queue wait time (avg/p95)
- Blocked dock duration

**UX metrics:**
- Misclick / undo rate
- Task completion success rate

---

## 11) Implementation Roadmap

### Phase 1 (Quick Win, 1–3 days)
- Add Left Queue panel (alerts + waiting sessions)
- Add Right Details drawer
- Keep existing center content as placeholder

### Phase 2 (Core, 1 week)
- Convert docks/sessions to board columns
- Add card quick actions
- Add SLA timers + severity

### Phase 3 (Advanced, 2+ weeks)
- Drag-and-drop assignments (optional)
- Bulk acknowledge + shift handover summary
- Personalization (pin docks, filter presets)

---

## 12) Recommendation Summary

- If your user’s day is mostly **responding & coordinating**, choose **Option 3**.
- It is the most scalable pattern for real operations because it’s **exception-driven** and **action-oriented**.

