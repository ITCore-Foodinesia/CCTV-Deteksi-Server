# Gudang Driver — Admin Panel (Theme Design System)

This is a **static** admin panel prototype generated from your PRD and styled to match the **Theme Design System** (Industrial‑Professional + Lime/Emerald accents).

It uses **Tailwind CDN** and **plain JavaScript** (no build step).

## Run locally

### Option A — open directly
Open `index.html` in your browser.

### Option B — run a local server (recommended)
Some browsers restrict ES Modules via `file://` URLs. Use a local server:

```bash
# from this folder
python -m http.server 5173
# then open:
# http://localhost:5173
```

## What’s included
- Sidebar navigation (Dashboard, Operational, Activity, System, Reports)
- Header with Tenant Selector, Notifications, Profile menu
- Pages: Dashboard, Drivers, Trucks, Docks, Helpers, Loaders, Loading Sessions, History, Notifications, Cameras, Users & Roles, Settings, Reports, Analytics
- Demo RBAC: switch role (owner/admin/member) and see what changes

## Theme tokens
- Dark slate: `#1A2E35`
- Primary (Lime): `#84CC16` (hover: `#4D7C0F`)
- Accent (Emerald): `#10B981`
- Background: `#F9FAFB`

## Notes
- This is a UI-only prototype (data is in-memory). Replace state with Supabase queries / realtime later.
