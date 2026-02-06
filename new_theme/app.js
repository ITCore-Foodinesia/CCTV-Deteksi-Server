// Gudang Driver — Admin Panel (Prototype)
// Single-page static UI (no build step).
// - Routing: hash-based (e.g. #/drivers)
// - Data: in-memory demo state (replace with Supabase later)
// - Layout: Sidebar + Header per PRD

/* ----------------------------- Utilities ----------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Duration formatter (seconds -> "Xm" or "Xh Ym")
function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return "-";
  const mins = Math.floor(Number(seconds) / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function showToast(message, variant = "info") {
  const root = $("#toast-root");
  const id = uid("toast");
  const styles = {
    info: "bg-[#1A2E35] text-white",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-600 text-white",
    danger: "bg-red-600 text-white",
  };
  const el = document.createElement("div");
  el.id = id;
  el.className = `max-w-sm rounded-xl px-4 py-3 shadow-lg ${styles[variant] ?? styles.info}`;
  el.role = "status";
  el.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="text-lg leading-none">🔔</div>
      <div class="text-sm leading-snug">${escapeHtml(message)}</div>
      <button class="ml-auto -mr-1 -mt-1 rounded-md px-2 py-1 text-xs/none opacity-80 hover:opacity-100" aria-label="Close toast">✕</button>
    </div>
  `;
  root.appendChild(el);

  $("button", el).addEventListener("click", () => el.remove());
  setTimeout(() => el.remove(), 3500);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function paginate(arr, page, pageSize) {
  const total = arr.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = clamp(page, 1, pages);
  const start = (safePage - 1) * pageSize;
  return {
    items: arr.slice(start, start + pageSize),
    page: safePage,
    pages,
    total,
    pageSize,
  };
}

/* ----------------------------- PRD enums ----------------------------- */

const DRIVER_STATUSES = ["pending_approval", "active", "suspended", "inactive"];
const DOCK_STATUSES = ["available", "loading", "unloading", "maintenance", "reserved", "closed"];
const SESSION_STATUSES = ["waiting", "loading", "unloading", "completed", "cancelled"];
const USER_ROLES = ["owner", "admin", "member"];

function getStatusBadgeClass(status) {
  // Align with Theme & Design System semantic colors
  const classes = {
    active: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    pending_approval: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    suspended: "bg-red-100 text-red-800 ring-1 ring-red-200",
    inactive: "bg-gray-100 text-gray-800 ring-1 ring-gray-200",
  };
  return classes[status] || "bg-gray-100 text-gray-800 ring-1 ring-gray-200";
}

// Dock status colors per PRD (Mock Admin mapping)
function getDockCardClass(status) {
  // Dock status colors per Theme & Design System
  const classes = {
    available: "border-emerald-500 bg-emerald-50 text-emerald-900",
    loading: "border-orange-500 bg-orange-50 text-orange-900",
    unloading: "border-orange-500 bg-orange-50 text-orange-900",
    maintenance: "border-red-500 bg-red-50 text-red-900",
    reserved: "border-blue-500 bg-blue-50 text-blue-900",
    closed: "border-gray-500 bg-gray-50 text-gray-900",
  };
  return classes[status] || "border-gray-200 bg-white text-gray-900";
}

function statusLabel(s) {
  return String(s).replaceAll("_", " ");
}

/* ----------------------------- Demo state ---------------------------- */

const state = {
  tenantId: "TENANT-001",
  tenants: [
    { id: "TENANT-001", name: "PT Gudang Driver (Demo)", plan: "pro", timezone: "Asia/Makassar" },
    { id: "TENANT-002", name: "Warehouse Beta", plan: "basic", timezone: "Asia/Jakarta" },
  ],
  me: {
    name: "Admin Demo",
    email: "admin@example.com",
    role: "owner", // changeable in UI
  },

  drivers: [
    { id: uid("drv"), driver_code: "DRV-0001", name: "Budi Santoso", phone: "081234567890", email: "budi@example.com", company_name: "Vendor A", status: "active", created_at: Date.now() - 1000 * 60 * 60 * 24 * 10 },
    { id: uid("drv"), driver_code: "DRV-0002", name: "Ahmad Wijaya", phone: "081234567891", email: "", company_name: "Vendor B", status: "pending_approval", created_at: Date.now() - 1000 * 60 * 60 * 24 * 2 },
    { id: uid("drv"), driver_code: "DRV-0003", name: "Siti Rahayu", phone: "081234567892", email: "siti@example.com", company_name: "", status: "suspended", created_at: Date.now() - 1000 * 60 * 60 * 24 * 6 },
  ],
  trucks: [
    { id: uid("trk"), plate_number: "B 1234 XY", vehicle_type: "CDD Box", brand_model: "Isuzu", is_registered: true, created_at: Date.now() - 1000 * 60 * 60 * 24 * 4 },
    { id: uid("trk"), plate_number: "B 5678 AB", vehicle_type: "Fuso", brand_model: "Mitsubishi", is_registered: true, created_at: Date.now() - 1000 * 60 * 60 * 24 * 9 },
    { id: uid("trk"), plate_number: "DD 9999 ZZ", vehicle_type: "Pickup", brand_model: "Toyota", is_registered: false, created_at: Date.now() - 1000 * 60 * 60 * 24 * 1 },
  ],
  docks: [
    { id: uid("dock"), dock_code: "D-01", dock_name: "Dock Utama 1", status: "available", maintenance_reason: "", capacity: 1 },
    { id: uid("dock"), dock_code: "D-02", dock_name: "Dock Utama 2", status: "loading", maintenance_reason: "", capacity: 1, plate: "B 1234 XY", started_at: Date.now() - 1000 * 60 * 42 },
    { id: uid("dock"), dock_code: "D-03", dock_name: "Dock Samping", status: "available", maintenance_reason: "", capacity: 1 },
    { id: uid("dock"), dock_code: "D-04", dock_name: "Dock Maintenance", status: "maintenance", maintenance_reason: "Perbaikan lantai", capacity: 1 },
  ],
  helpers: [
    { id: uid("hlp"), name: "Rama", phone: "081200010001", status: "active" },
    { id: uid("hlp"), name: "Dian", phone: "081200010002", status: "inactive" },
  ],
  loaders: [
    { id: uid("ldr"), name: "Yanto", phone: "081200020001", status: "active" },
  ],
  sessions: [
    { id: uid("ses"), driver_name: "Budi Santoso", driver_code: "DRV-0001", plate_number: "B 1234 XY", dock_code: "D-02", status: "loading", started_at: Date.now() - 1000 * 60 * 42, duration_seconds: 1000 * 60 * 42 / 1000 },
    { id: uid("ses"), driver_name: "Ahmad Wijaya", driver_code: "DRV-0002", plate_number: "B 5678 AB", dock_code: "D-01", status: "waiting", started_at: Date.now() - 1000 * 60 * 5, duration_seconds: 1000 * 60 * 5 / 1000 },
    { id: uid("ses"), driver_name: "Siti Rahayu", driver_code: "DRV-0003", plate_number: "DD 9999 ZZ", dock_code: "D-03", status: "completed", started_at: Date.now() - 1000 * 60 * 180, finished_at: Date.now() - 1000 * 60 * 100, duration_seconds: 1000 * 60 * 80 / 1000 },
  ],
  notifications: [
    { id: uid("ntf"), created_at: Date.now() - 1000 * 60 * 20, type: "info", target: "broadcast", title: "Pengumuman", message: "Dock D-01 dan D-02 akan ditutup besok 08:00 untuk perbaikan." },
  ],
  cameras: [
    { id: uid("cam"), name: "Gate Cam 1", stream_url: "rtsp://example/cam1", dock_code: "D-01", online: true },
  ],
  users: [
    { id: uid("usr"), email: "owner@example.com", name: "Owner", role: "owner" },
    { id: uid("usr"), email: "ops@example.com", name: "Ops Admin", role: "admin" },
    { id: uid("usr"), email: "viewer@example.com", name: "Viewer", role: "member" },
  ],
  settings: {
    tenant: { name: "PT Gudang Driver (Demo)", slug: "gudang-driver-demo", plan: "pro", timezone: "Asia/Makassar" },
    operational: { max_loading_duration: 120, alert_threshold: 90, auto_approve_drivers: false, require_photo: false, enable_cctv_detection: true },
    notification: { email_notifications: true, sms_notifications: false, alert_recipients: ["ops@example.com"] },
  },

  activity: [
    { id: uid("act"), ts: Date.now() - 1000 * 60 * 2, icon: "🟢", text: 'Driver "Budi Santoso" started loading at D-02' },
    { id: uid("act"), ts: Date.now() - 1000 * 60 * 18, icon: "🟡", text: "Dock D-04 set to maintenance" },
    { id: uid("act"), ts: Date.now() - 1000 * 60 * 55, icon: "🔵", text: 'Driver "Ahmad Wijaya" waiting at D-01' },
  ],
};

/* ----------------------------- Permissions -------------------------- */

// Permission Matrix from PRD (simplified as predicates)
const permissions = {
  viewDashboard: (role) => ["owner", "admin", "member"].includes(role),
  manageDrivers: (role) => ["owner", "admin"].includes(role),
  manageTrucks: (role) => ["owner", "admin"].includes(role),
  manageDocks: (role) => ["owner", "admin"].includes(role),
  viewSessions: (role) => ["owner", "admin", "member"].includes(role),
  forceStopSession: (role) => ["owner", "admin"].includes(role),
  sendNotifications: (role) => ["owner", "admin"].includes(role),
  manageUsers: (role) => ["owner"].includes(role),
  manageSettings: (role) => ["owner"].includes(role),
  viewReports: (role) => ["owner", "admin", "member"].includes(role),
  exportData: (role) => ["owner", "admin"].includes(role),
  deleteData: (role) => ["owner"].includes(role),
};

/* ----------------------------- Router -------------------------------- */

const ROUTES = [
  { key: "dashboard", label: "Dashboard", icon: "📊", group: "main", path: "/dashboard" },

  { key: "drivers", label: "Drivers", icon: "👤", group: "operasional", path: "/drivers", gate: permissions.manageDrivers },
  { key: "trucks", label: "Trucks", icon: "🚚", group: "operasional", path: "/trucks", gate: permissions.manageTrucks },
  { key: "docks", label: "Docks", icon: "🏗️", group: "operasional", path: "/docks", gate: permissions.manageDocks },
  { key: "helpers", label: "Helpers", icon: "👷", group: "operasional", path: "/helpers", gate: permissions.manageDrivers },
  { key: "loaders", label: "Loaders", icon: "🧑‍🔧", group: "operasional", path: "/loaders", gate: permissions.manageDrivers },

  { key: "sessions", label: "Loading Sessions", icon: "⏱️", group: "aktivitas", path: "/sessions", gate: permissions.viewSessions },
  { key: "history", label: "History", icon: "📜", group: "aktivitas", path: "/history", gate: permissions.viewSessions },
  { key: "notifications", label: "Notifications", icon: "🔔", group: "aktivitas", path: "/notifications", gate: permissions.sendNotifications },

  { key: "cameras", label: "Cameras", icon: "📹", group: "sistem", path: "/cameras", gate: permissions.manageDocks },
  { key: "users", label: "Users & Roles", icon: "👥", group: "sistem", path: "/users", gate: permissions.manageUsers },
  { key: "settings", label: "Settings", icon: "⚙️", group: "sistem", path: "/settings", gate: permissions.manageSettings },

  { key: "reports", label: "Reports", icon: "📈", group: "laporan", path: "/reports", gate: permissions.viewReports },
  { key: "analytics", label: "Analytics", icon: "📊", group: "laporan", path: "/analytics", gate: permissions.viewReports },
];

function getRouteKeyFromHash() {
  const hash = (location.hash || "#/dashboard").replace(/^#/, "");
  const hit = ROUTES.find((r) => r.path === hash);
  return hit?.key ?? "dashboard";
}

function navigateTo(path) {
  location.hash = `#${path}`;
}

/* ----------------------------- Layout -------------------------------- */

function renderLayout(activeKey) {
  const role = state.me.role;

  const groups = [
    { key: "main", label: null },
    { key: "operasional", label: "OPERASIONAL" },
    { key: "aktivitas", label: "AKTIVITAS" },
    { key: "sistem", label: "SISTEM" },
    { key: "laporan", label: "LAPORAN" },
  ];

  const sidebarLinks = groups
    .map((g) => {
      const items = ROUTES.filter((r) => r.group === g.key);
      const visible = items.filter((r) => (r.gate ? r.gate(role) : true));

      if (visible.length === 0) return "";

      const header =
        g.label
          ? `<div class="px-3 pt-6 pb-2 text-[11px] font-semibold tracking-wider text-gray-400">${g.label}</div>`
          : `<div class="px-3 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-gray-400">MAIN</div>`;

      const links = visible
        .map((r) => {
          const isActive = r.key === activeKey;
          const base = "flex items-center gap-3 rounded-[14px] px-3 py-2 text-sm transition";
          const cls = isActive
            ? `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`
            : `${base} text-gray-700 hover:bg-gray-100 hover:text-gray-900`;
          return `
            <a href="#${r.path}" data-nav="${r.key}" class="${cls}" aria-current="${isActive ? "page" : "false"}">
              <span class="text-base">${r.icon}</span>
              <span class="truncate">${escapeHtml(r.label)}</span>
            </a>
          `;
        })
        .join("");

      return `
        ${header}
        <div class="px-2">
          <div class="flex flex-col gap-1">${links}</div>
        </div>
      `;
    })
    .join("");

  const tenantOptions = state.tenants
    .map((t) => `<option value="${escapeHtml(t.id)}"${t.id === state.tenantId ? " selected" : ""}>${escapeHtml(t.name)}</option>`)
    .join("");

  return `
    <div class="flex min-h-screen">
      <!-- Sidebar -->
      <aside class="hidden lg:flex lg:w-72 lg:flex-col lg:gap-2 lg:border-r lg:border-gray-200 lg:bg-white lg:text-gray-900">
        <div class="px-4 py-4">
          <div class="flex items-center gap-3">
            <div class="grid h-10 w-10 place-items-center rounded-2xl bg-[#84CC16] text-[#1A2E35] shadow-sm">🏭</div>
            <div>
              <div class="text-sm font-semibold leading-tight text-gray-900">GUDANG DRIVER</div>
              <div class="text-xs text-gray-500">Admin Panel • Prototype</div>
            </div>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto no-scrollbar pb-6">
          ${sidebarLinks}
        </div>
        <div class="border-t border-gray-200 p-3">
          <div class="text-xs text-gray-500">Role</div>
          <div class="mt-1 flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-gray-900">${escapeHtml(role)}</span>
            <button id="btn-role" class="rounded-[14px] bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">Switch</button>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Header -->
        <header class="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div class="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
            <button id="btn-mobile-menu" class="lg:hidden rounded-[14px] bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15" aria-label="Open navigation">☰</button>

            <div class="flex min-w-0 items-center gap-3">
              <label class="sr-only" for="tenant-select">Tenant selector</label>
              <select id="tenant-select" class="w-[220px] max-w-[55vw] rounded-[14px] border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
                ${tenantOptions}
              </select>
              <span class="hidden sm:inline text-xs text-gray-500">Plan: <span class="font-semibold text-gray-800">${escapeHtml(state.tenants.find(t => t.id===state.tenantId)?.plan ?? "-")}</span></span>
            </div>

            <div class="ml-auto flex items-center gap-2">
              <button id="btn-bell" class="relative rounded-[14px] bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15" aria-label="Notifications">
                🔔
                <span class="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">${state.notifications.length}</span>
              </button>

              <div class="relative">
                <button id="btn-profile" class="rounded-[14px] bg-[#1A2E35] px-3 py-2 text-sm font-semibold text-white hover:opacity-95" aria-haspopup="menu" aria-expanded="false">
                  👤 ${escapeHtml(state.me.name)}
                </button>
                <div id="profile-menu" data-hidden="true" class="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                  <div class="px-3 py-2">
                    <div class="text-sm font-semibold">${escapeHtml(state.me.name)}</div>
                    <div class="text-xs text-gray-500">${escapeHtml(state.me.email)}</div>
                  </div>
                  <div class="my-2 h-px bg-gray-200"></div>
                  <button data-action="switch-role" class="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100">Switch role</button>
                  <button data-action="sign-out" class="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100">Sign out (demo)</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Content -->
        <main class="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
          <div id="page"></div>
        </main>
      </div>
    </div>

    <!-- Mobile drawer -->
    <div id="mobile-drawer" data-hidden="true" class="fixed inset-0 z-50 lg:hidden">
      <div class="absolute inset-0 bg-black/40" data-action="close-drawer"></div>
      <div class="absolute left-0 top-0 h-full w-[86vw] max-w-sm bg-white text-gray-900 shadow-xl">
        <div class="px-4 py-4 flex items-center gap-3 border-b border-gray-200">
          <div class="grid h-10 w-10 place-items-center rounded-2xl bg-[#84CC16] text-[#1A2E35] shadow-sm">🏭</div>
          <div>
            <div class="text-sm font-semibold leading-tight text-gray-900">GUDANG DRIVER</div>
            <div class="text-xs text-gray-500">Admin Panel • Prototype</div>
          </div>
          <button class="ml-auto rounded-[14px] bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200" data-action="close-drawer" aria-label="Close navigation">✕</button>
        </div>
        <div class="h-full overflow-y-auto no-scrollbar pb-6">
          ${sidebarLinks}
        </div>
      </div>
    </div>
  `;
}

function attachLayoutHandlers() {
  // Mobile drawer
  $("#btn-mobile-menu")?.addEventListener("click", () => $("#mobile-drawer")?.setAttribute("data-hidden", "false"));
  $("#mobile-drawer")?.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.dataset?.action === "close-drawer") $("#mobile-drawer")?.setAttribute("data-hidden", "true");
  });
  $$("#mobile-drawer a[data-nav]").forEach((a) => a.addEventListener("click", () => $("#mobile-drawer")?.setAttribute("data-hidden", "true")));

  // Tenant select
  $("#tenant-select")?.addEventListener("change", (e) => {
    state.tenantId = e.target.value;
    showToast(`Tenant switched: ${state.tenants.find(t => t.id===state.tenantId)?.name ?? state.tenantId}`, "success");
    renderApp();
  });

  // Bell button quick nav
  $("#btn-bell")?.addEventListener("click", () => navigateTo("/notifications"));

  // Profile menu toggle
  const btnProfile = $("#btn-profile");
  const menu = $("#profile-menu");
  btnProfile?.addEventListener("click", () => {
    const hidden = menu?.getAttribute("data-hidden") === "true";
    menu?.setAttribute("data-hidden", hidden ? "false" : "true");
    btnProfile.setAttribute("aria-expanded", hidden ? "true" : "false");
  });
  document.addEventListener("click", (e) => {
    if (!menu || !btnProfile) return;
    const target = e.target;
    if (menu.contains(target) || btnProfile.contains(target)) return;
    menu.setAttribute("data-hidden", "true");
    btnProfile.setAttribute("aria-expanded", "false");
  });
  menu?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "switch-role") {
      switchRole();
      menu.setAttribute("data-hidden", "true");
      btnProfile.setAttribute("aria-expanded", "false");
    }
    if (action === "sign-out") {
      showToast("Sign out is not implemented in prototype 😉", "warning");
      menu.setAttribute("data-hidden", "true");
      btnProfile.setAttribute("aria-expanded", "false");
    }
  });

  $("#btn-role")?.addEventListener("click", () => switchRole());
}

function switchRole() {
  const idx = USER_ROLES.indexOf(state.me.role);
  state.me.role = USER_ROLES[(idx + 1) % USER_ROLES.length];
  showToast(`Role switched to: ${state.me.role}`, "info");

  // If current route becomes forbidden, navigate to dashboard
  const activeKey = getRouteKeyFromHash();
  const route = ROUTES.find((r) => r.key === activeKey);
  if (route?.gate && !route.gate(state.me.role)) navigateTo("/dashboard");
  renderApp();
}

/* ----------------------------- Page shells --------------------------- */

function sectionTitle(title, rightHtml = "") {
  return `
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">${escapeHtml(title)}</h1>
        <div class="mt-1 text-sm text-gray-500">Tenant: <span class="font-medium text-gray-800">${escapeHtml(state.tenants.find(t => t.id===state.tenantId)?.name ?? state.tenantId)}</span></div>
      </div>
      <div class="flex items-center gap-2">${rightHtml}</div>
    </div>
  `;
}

function card(inner, cls = "") {
  return `<div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${cls}">${inner}</div>`;
}

function pill(text, cls) {
  return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}">${escapeHtml(text)}</span>`;
}

function emptyState(title, hint) {
  return `
    <div class="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <div class="text-3xl">🧩</div>
      <div class="mt-3 text-base font-semibold">${escapeHtml(title)}</div>
      <div class="mt-1 text-sm text-gray-500">${escapeHtml(hint)}</div>
    </div>
  `;
}

/* ----------------------------- Dashboard ----------------------------- */

function renderDashboard() {
  const activeSessions = state.sessions.filter((s) => ["waiting", "loading", "unloading"].includes(s.status)).length;
  const availableDocks = state.docks.filter((d) => d.status === "available").length;
  const totalDrivers = state.drivers.length;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayCompleted = state.sessions.filter((s) => s.status === "completed" && (s.finished_at ?? 0) >= today.getTime()).length;

  const quickActions = [
    { label: "Add Driver", icon: "➕", onClick: () => openModal("modal-add-driver") },
    { label: "Add Helper", icon: "➕", onClick: () => openModal("modal-add-helper") },
    { label: "Add Loader", icon: "➕", onClick: () => openModal("modal-add-loader") },
    { label: "View Docks", icon: "🏗️", onClick: () => navigateTo("/docks") },
    { label: "Refresh", icon: "🔄", onClick: () => showToast("Refreshed (demo)", "success") },
  ];

  const kpis = [
    { label: "Active Sessions", value: activeSessions, icon: "⏱️" },
    { label: "Available Docks", value: availableDocks, icon: "🏗️" },
    { label: "Total Drivers", value: totalDrivers, icon: "👤" },
    { label: "Today Completed", value: todayCompleted, icon: "✅" },
  ];

  const kpiGrid = `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      ${kpis.map((k) => card(`
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">${escapeHtml(k.label)}</div>
            <div class="mt-1 text-2xl font-semibold">${escapeHtml(k.value)}</div>
          </div>
          <div class="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-xl">${k.icon}</div>
        </div>
      `)).join("")}
    </div>
  `;

  const dockGrid = `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      ${state.docks.map((d) => {
        const cls = getDockCardClass(d.status);
        const timer = d.started_at ? `<div class="mt-2 text-xs text-gray-800"><span class="font-semibold">Started</span> ${formatTime(d.started_at)}</div>` : "";
        const plate = d.plate ? `<div class="mt-1 text-xs text-gray-800"><span class="font-semibold">🚚</span> ${escapeHtml(d.plate)}</div>` : "";
        return `
          <div class="rounded-2xl border-2 p-4 shadow-sm ${cls}">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="text-sm font-semibold">${escapeHtml(d.dock_code)} <span class="text-xs font-normal opacity-80">${escapeHtml(d.dock_name ?? "")}</span></div>
                <div class="mt-1 text-xs uppercase tracking-wider opacity-80">${escapeHtml(d.status)}</div>
                ${plate}
                ${timer}
              </div>
              <button class="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white" data-action="dock-toggle" data-id="${d.id}">
                ${d.status === "maintenance" ? "End Maint" : "Set Maint"}
              </button>
            </div>
            ${d.maintenance_reason ? `<div class="mt-3 text-xs opacity-80">🧰 ${escapeHtml(d.maintenance_reason)}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;

  const activity = `
    <div class="space-y-2">
      ${state.activity
        .slice()
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 8)
        .map((a) => `
          <div class="flex items-start gap-3 rounded-xl bg-gray-100 px-3 py-2">
            <div class="text-base leading-none">${a.icon}</div>
            <div class="min-w-0">
              <div class="text-sm text-gray-900">${escapeHtml(a.text)}</div>
              <div class="text-xs text-gray-500">${formatTime(a.ts)}</div>
            </div>
          </div>
        `).join("")}
    </div>
  `;

  const qa = `
    <div class="grid gap-2 sm:grid-cols-2">
      ${quickActions.map((a, i) => `
        <button class="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-100" data-action="quick-action" data-idx="${i}">
          <div class="text-sm font-semibold">${a.icon} ${escapeHtml(a.label)}</div>
          <div class="mt-1 text-xs text-gray-500">Shortcut</div>
        </button>
      `).join("")}
    </div>
  `;

  return `
    ${sectionTitle("Dashboard")}
    ${kpiGrid}

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      ${card(`
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">Dock Status (Live)</div>
          <button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="refresh-docks">Refresh</button>
        </div>
        <div class="mt-3">${dockGrid}</div>
      `, "lg:col-span-2")}

      ${card(`
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">Quick Actions</div>
          <div class="text-xs text-gray-500">Common tasks</div>
        </div>
        <div class="mt-3">${qa}</div>
      `)}
    </div>

    <div class="mt-4">
      ${card(`
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">Recent Activity</div>
          <button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="view-history">View All</button>
        </div>
        <div class="mt-3">${activity}</div>
      `)}
    </div>

    ${renderCommonModals()}
  `;
}

function attachDashboardHandlers() {
  $$("#page [data-action='dock-toggle']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const dock = state.docks.find((d) => d.id === id);
      if (!dock) return;

      if (!permissions.manageDocks(state.me.role)) {
        showToast("Not allowed: manage docks", "danger");
        return;
      }

      if (dock.status === "maintenance") {
        dock.status = "available";
        dock.maintenance_reason = "";
        pushActivity("🟢", `Dock ${dock.dock_code} → available`);
        showToast(`Dock ${dock.dock_code} back to available`, "success");
      } else {
        dock.status = "maintenance";
        dock.maintenance_reason = "Maintenance (demo)";
        pushActivity("🟡", `Dock ${dock.dock_code} → maintenance`);
        showToast(`Dock ${dock.dock_code} set to maintenance`, "warning");
      }
      renderApp();
    });
  });

  $("#page [data-action='refresh-docks']")?.addEventListener("click", () => showToast("Refreshed docks (demo)", "success"));
  $("#page [data-action='view-history']")?.addEventListener("click", () => navigateTo("/history"));

  $$("#page [data-action='quick-action']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const actions = [
        () => openModal("modal-add-driver"),
        () => openModal("modal-add-helper"),
        () => openModal("modal-add-loader"),
        () => navigateTo("/docks"),
        () => showToast("Refreshed (demo)", "success"),
      ];
      actions[idx]?.();
    });
  });
}

/* ----------------------------- Drivers ------------------------------- */

function renderDrivers() {
  const q = (sessionStorage.getItem("drivers.q") ?? "").toLowerCase().trim();
  const status = sessionStorage.getItem("drivers.status") ?? "all";
  const page = Number(sessionStorage.getItem("drivers.page") ?? "1");
  const pageSize = 10;

  let filtered = state.drivers.slice().sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  if (q) {
    filtered = filtered.filter((d) =>
      [d.driver_code, d.name, d.phone, d.email, d.company_name].some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }
  if (status !== "all") filtered = filtered.filter((d) => d.status === status);

  const pg = paginate(filtered, page, pageSize);

  const statusOptions = ["all", ...DRIVER_STATUSES]
    .map((s) => `<option value="${s}"${s === status ? " selected" : ""}>${s === "all" ? "All" : s}</option>`)
    .join("");

  const headActions = `
    <button class="rounded-[14px] bg-[#84CC16] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="open-add-driver">+ Add Driver</button>
  `;

  const table = pg.items.length
    ? `
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th class="py-3 pr-4">Code</th>
              <th class="py-3 pr-4">Name</th>
              <th class="py-3 pr-4">Phone</th>
              <th class="py-3 pr-4">Email</th>
              <th class="py-3 pr-4">Status</th>
              <th class="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${pg.items
              .map((d) => `
                <tr>
                  <td class="py-3 pr-4 font-mono text-xs">${escapeHtml(d.driver_code)}</td>
                  <td class="py-3 pr-4 font-semibold">${escapeHtml(d.name)}</td>
                  <td class="py-3 pr-4">${escapeHtml(d.phone)}</td>
                  <td class="py-3 pr-4">${escapeHtml(d.email || "-")}</td>
                  <td class="py-3 pr-4">${pill(statusLabel(d.status), getStatusBadgeClass(d.status))}</td>
                  <td class="py-3 pr-4">
                    <div class="flex flex-wrap gap-2">
                      <button class="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold hover:bg-gray-200" data-action="driver-status" data-id="${d.id}" data-next="active">Activate</button>
                      <button class="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold hover:bg-gray-200" data-action="driver-status" data-id="${d.id}" data-next="suspended">Suspend</button>
                      <button class="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95" data-action="driver-delete" data-id="${d.id}">Delete</button>
                    </div>
                  </td>
                </tr>
              `)
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState("No drivers found", "Try changing the search or filter.");

  const pager = `
    <div class="mt-4 flex items-center justify-between gap-3">
      <div class="text-sm text-gray-600">Showing <span class="font-semibold">${(pg.page - 1) * pg.pageSize + 1}</span>–<span class="font-semibold">${(pg.page - 1) * pg.pageSize + pg.items.length}</span> of <span class="font-semibold">${pg.total}</span></div>
      <div class="flex items-center gap-2">
        <button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="drivers-page" data-page="${pg.page - 1}" ${pg.page <= 1 ? "disabled" : ""}>Prev</button>
        <div class="text-xs text-gray-500">Page <span class="font-semibold text-gray-800">${pg.page}</span>/<span class="font-semibold text-gray-800">${pg.pages}</span></div>
        <button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="drivers-page" data-page="${pg.page + 1}" ${pg.page >= pg.pages ? "disabled" : ""}>Next</button>
      </div>
    </div>
  `;

  const controls = `
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="flex-1">
        <label class="sr-only" for="drivers-search">Search drivers</label>
        <input id="drivers-search" value="${escapeHtml(q)}" placeholder="Search (name / phone / code)..." class="w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500" for="drivers-status">Status</label>
        <select id="drivers-status" class="rounded-[14px] border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
          ${statusOptions}
        </select>
      </div>
      <button class="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold hover:bg-gray-200" data-action="drivers-reset">Reset</button>
    </div>
  `;

  return `
    ${sectionTitle("Drivers", headActions)}
    ${card(controls + table + pager)}
    ${renderCommonModals()}
  `;
}

function attachDriversHandlers() {
  $("#page [data-action='open-add-driver']")?.addEventListener("click", () => openModal("modal-add-driver"));

  $("#drivers-search")?.addEventListener("input", (e) => {
    sessionStorage.setItem("drivers.q", e.target.value);
    sessionStorage.setItem("drivers.page", "1");
    renderApp();
  });
  $("#drivers-status")?.addEventListener("change", (e) => {
    sessionStorage.setItem("drivers.status", e.target.value);
    sessionStorage.setItem("drivers.page", "1");
    renderApp();
  });
  $("#page [data-action='drivers-reset']")?.addEventListener("click", () => {
    sessionStorage.removeItem("drivers.q");
    sessionStorage.removeItem("drivers.status");
    sessionStorage.removeItem("drivers.page");
    renderApp();
  });

  $$("#page [data-action='drivers-page']").forEach((btn) => {
    btn.addEventListener("click", () => {
      sessionStorage.setItem("drivers.page", btn.dataset.page);
      renderApp();
    });
  });

  $$("#page [data-action='driver-status']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.manageDrivers(state.me.role)) return showToast("Not allowed: manage drivers", "danger");

      const id = btn.dataset.id;
      const next = btn.dataset.next;
      const d = state.drivers.find((x) => x.id === id);
      if (!d) return;

      d.status = next;
      pushActivity("🟢", `Driver "${d.name}" status → ${next}`);
      showToast(`Driver "${d.name}" updated to ${next}`, "success");
      renderApp();
    });
  });

  $$("#page [data-action='driver-delete']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.deleteData(state.me.role)) return showToast("Not allowed: delete drivers (owner only)", "danger");

      const id = btn.dataset.id;
      const d = state.drivers.find((x) => x.id === id);
      if (!d) return;
      if (!confirm(`Delete driver ${d.name}? (demo)`)) return;

      state.drivers = state.drivers.filter((x) => x.id !== id);
      pushActivity("🔴", `Driver "${d.name}" deleted`);
      showToast(`Driver "${d.name}" deleted`, "warning");
      renderApp();
    });
  });
}

/* ----------------------------- Trucks -------------------------------- */

const VEHICLE_TYPES = ["CDE Box", "CDD Box", "Fuso", "Tronton", "Wingbox", "Pickup"];

function renderTrucks() {
  const headActions = `
    <button class="rounded-[14px] bg-[#84CC16] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="open-add-truck">+ Add Truck</button>
  `;

  const rows = state.trucks
    .slice()
    .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
    .map((t) => `
      <tr>
        <td class="py-3 pr-4 font-mono text-xs">${escapeHtml(t.plate_number)}</td>
        <td class="py-3 pr-4">${escapeHtml(t.vehicle_type ?? "-")}</td>
        <td class="py-3 pr-4">${escapeHtml(t.brand_model ?? "-")}</td>
        <td class="py-3 pr-4">${t.is_registered ? pill("registered", "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200") : pill("unregistered", "bg-amber-100 text-amber-800 ring-1 ring-amber-200")}</td>
        <td class="py-3 pr-4">
          <button class="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95" data-action="truck-delete" data-id="${t.id}">Delete</button>
        </td>
      </tr>
    `).join("");

  return `
    ${sectionTitle("Trucks", headActions)}
    ${card(`
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th class="py-3 pr-4">Plate</th>
              <th class="py-3 pr-4">Type</th>
              <th class="py-3 pr-4">Brand/Model</th>
              <th class="py-3 pr-4">Registered</th>
              <th class="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">${rows || ""}</tbody>
        </table>
      </div>
      ${state.trucks.length ? "" : `<div class="mt-4">${emptyState("No trucks yet", "Add a truck to start tracking sessions.")}</div>`}
    `)}
    ${renderCommonModals()}
  `;
}

function attachTrucksHandlers() {
  $("#page [data-action='open-add-truck']")?.addEventListener("click", () => openModal("modal-add-truck"));

  $$("#page [data-action='truck-delete']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.deleteData(state.me.role)) return showToast("Not allowed: delete trucks (owner only)", "danger");

      const id = btn.dataset.id;
      const t = state.trucks.find((x) => x.id === id);
      if (!t) return;
      if (!confirm(`Delete truck ${t.plate_number}? (demo)`)) return;

      state.trucks = state.trucks.filter((x) => x.id !== id);
      pushActivity("🔴", `Truck "${t.plate_number}" deleted`);
      showToast(`Truck "${t.plate_number}" deleted`, "warning");
      renderApp();
    });
  });
}

/* ----------------------------- Docks --------------------------------- */

function renderDocks() {
  const headActions = `
    <button class="rounded-[14px] bg-[#84CC16] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="open-add-dock">+ Add Dock</button>
  `;

  const filterStatus = sessionStorage.getItem("docks.status") ?? "all";

  const statusOptions = ["all", ...DOCK_STATUSES]
    .map((s) => `<option value="${s}"${s === filterStatus ? " selected" : ""}>${s === "all" ? "All" : s}</option>`)
    .join("");

  const filtered = state.docks.filter((d) => (filterStatus === "all" ? true : d.status === filterStatus));

  const grid = `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      ${filtered.map((d) => {
        const cls = getDockCardClass(d.status);
        const hint = d.status === "maintenance" ? (d.maintenance_reason ? `🧰 ${escapeHtml(d.maintenance_reason)}` : "🧰 Maintenance") : "";
        const extra = d.status === "loading" || d.status === "unloading"
          ? `<div class="mt-2 text-xs opacity-90">🚚 ${escapeHtml(d.plate ?? "Unknown")} • ⏱️ ${formatDuration((Date.now() - (d.started_at ?? Date.now())) / 1000)}</div>`
          : hint ? `<div class="mt-2 text-xs opacity-90">${hint}</div>` : `<div class="mt-2 text-xs opacity-70">Capacity: ${escapeHtml(d.capacity ?? 1)}</div>`;

        return `
          <div class="rounded-2xl border-2 p-4 shadow-sm ${cls}">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="text-sm font-semibold">${escapeHtml(d.dock_code)} <span class="text-xs font-normal opacity-80">${escapeHtml(d.dock_name ?? "")}</span></div>
                <div class="mt-1 text-xs uppercase tracking-wider opacity-80">${escapeHtml(d.status)}</div>
              </div>
              <div class="flex gap-2">
                <button class="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white" data-action="dock-set-status" data-id="${d.id}">Set</button>
                <button class="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white" data-action="dock-delete" data-id="${d.id}">Del</button>
              </div>
            </div>
            ${extra}
          </div>
        `;
      }).join("")}
    </div>
  `;

  const controls = `
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500" for="docks-status">Status</label>
        <select id="docks-status" class="rounded-[14px] border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
          ${statusOptions}
        </select>
      </div>
      <div class="text-xs text-gray-500">Legend: 🟢 available • 🟠 loading/unloading • 🔴 maintenance • 🔵 reserved • ⚫ closed</div>
    </div>
  `;

  return `
    ${sectionTitle("Docks", headActions)}
    ${card(controls + (filtered.length ? grid : emptyState("No docks match the filter", "Try a different status filter.")))}
    ${renderCommonModals()}
    ${renderModalSetDockStatus()}
  `;
}

function attachDocksHandlers() {
  $("#page [data-action='open-add-dock']")?.addEventListener("click", () => openModal("modal-add-dock"));

  $("#docks-status")?.addEventListener("change", (e) => {
    sessionStorage.setItem("docks.status", e.target.value);
    renderApp();
  });

  $$("#page [data-action='dock-set-status']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.manageDocks(state.me.role)) return showToast("Not allowed: manage docks", "danger");
      const id = btn.dataset.id;
      const d = state.docks.find((x) => x.id === id);
      if (!d) return;
      openDockStatusModal(d);
    });
  });

  $$("#page [data-action='dock-delete']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.deleteData(state.me.role)) return showToast("Not allowed: delete docks (owner only)", "danger");
      const id = btn.dataset.id;
      const d = state.docks.find((x) => x.id === id);
      if (!d) return;
      if (!confirm(`Delete dock ${d.dock_code}? (demo)`)) return;
      state.docks = state.docks.filter((x) => x.id !== id);
      pushActivity("🔴", `Dock ${d.dock_code} deleted`);
      showToast(`Dock ${d.dock_code} deleted`, "warning");
      renderApp();
    });
  });
}

/* ----------------------- Helpers & Loaders --------------------------- */

function renderPeople(kind) {
  const isHelper = kind === "helpers";
  const label = isHelper ? "Helpers" : "Loaders";
  const list = state[kind];

  const headActions = `
    <button class="rounded-[14px] bg-[#84CC16] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="open-add-${isHelper ? "helper" : "loader"}">+ Add ${label.slice(0, -1)}</button>
  `;

  const rows = list
    .map((p) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(p.name)}</td>
        <td class="py-3 pr-4">${escapeHtml(p.phone)}</td>
        <td class="py-3 pr-4">${pill(statusLabel(p.status), p.status === "active" ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200" : "bg-gray-100 text-gray-800 ring-1 ring-gray-200")}</td>
        <td class="py-3 pr-4">
          <div class="flex flex-wrap gap-2">
            <button class="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold hover:bg-gray-200" data-action="people-toggle" data-kind="${kind}" data-id="${p.id}">Toggle</button>
            <button class="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95" data-action="people-delete" data-kind="${kind}" data-id="${p.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

  return `
    ${sectionTitle(label, headActions)}
    ${card(`
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th class="py-3 pr-4">Name</th>
              <th class="py-3 pr-4">Phone</th>
              <th class="py-3 pr-4">Status</th>
              <th class="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">${rows || ""}</tbody>
        </table>
      </div>
      ${list.length ? "" : `<div class="mt-4">${emptyState(`No ${label.toLowerCase()} yet`, `Add a ${label.slice(0, -1).toLowerCase()} to start.`)}</div>`}
    `)}
    ${renderCommonModals()}
  `;
}

function attachPeopleHandlers() {
  $("#page [data-action='open-add-helper']")?.addEventListener("click", () => openModal("modal-add-helper"));
  $("#page [data-action='open-add-loader']")?.addEventListener("click", () => openModal("modal-add-loader"));

  $$("#page [data-action='people-toggle']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.manageDrivers(state.me.role)) return showToast("Not allowed", "danger");

      const kind = btn.dataset.kind;
      const id = btn.dataset.id;
      const p = state[kind].find((x) => x.id === id);
      if (!p) return;
      p.status = p.status === "active" ? "inactive" : "active";
      pushActivity("🟢", `${kind.slice(0, -1)} "${p.name}" status → ${p.status}`);
      showToast(`${p.name} → ${p.status}`, "success");
      renderApp();
    });
  });

  $$("#page [data-action='people-delete']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.deleteData(state.me.role)) return showToast("Not allowed: delete (owner only)", "danger");

      const kind = btn.dataset.kind;
      const id = btn.dataset.id;
      const p = state[kind].find((x) => x.id === id);
      if (!p) return;
      if (!confirm(`Delete ${kind.slice(0, -1)} ${p.name}? (demo)`)) return;
      state[kind] = state[kind].filter((x) => x.id !== id);
      pushActivity("🔴", `${kind.slice(0, -1)} "${p.name}" deleted`);
      showToast(`${p.name} deleted`, "warning");
      renderApp();
    });
  });
}

/* -------------------------- Loading Sessions -------------------------- */

function renderSessions() {
  const active = state.sessions.filter((s) => ["waiting", "loading", "unloading"].includes(s.status));
  const history = state.sessions.filter((s) => ["completed", "cancelled"].includes(s.status)).slice().sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0)).slice(0, 20);

  const activeCards = active.length
    ? `<div class="space-y-3">
        ${active.map((s) => card(`
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-sm font-semibold">Driver: ${escapeHtml(s.driver_name)} <span class="text-xs font-normal text-gray-500">(${escapeHtml(s.driver_code)})</span></div>
              <div class="mt-1 text-sm">🚚 <span class="font-mono">${escapeHtml(s.plate_number)}</span> → 🏭 Dock <span class="font-semibold">${escapeHtml(s.dock_code)}</span></div>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                ${pill(statusLabel(s.status), s.status === "waiting" ? "bg-gray-100 text-gray-800 ring-1 ring-gray-200" : "bg-amber-100 text-amber-900 ring-1 ring-amber-200")}
                <span>Started: <span class="font-semibold">${formatTime(s.started_at)}</span></span>
                <span>Duration: <span class="font-semibold">${formatDuration((Date.now() - s.started_at)/1000)}</span></span>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="session-view" data-id="${s.id}">View</button>
              <button class="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-95" data-action="session-force-stop" data-id="${s.id}">Force Stop</button>
            </div>
          </div>
        `)).join("")}
      </div>`
    : emptyState("No active sessions", "When drivers start loading/unloading, they will appear here.");

  const historyTable = history.length
    ? `
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th class="py-3 pr-4">Started</th>
              <th class="py-3 pr-4">Driver</th>
              <th class="py-3 pr-4">Plate</th>
              <th class="py-3 pr-4">Dock</th>
              <th class="py-3 pr-4">Status</th>
              <th class="py-3 pr-4">Duration</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${history.map((s) => `
              <tr>
                <td class="py-3 pr-4">${formatTime(s.started_at)}</td>
                <td class="py-3 pr-4 font-semibold">${escapeHtml(s.driver_name)}</td>
                <td class="py-3 pr-4 font-mono text-xs">${escapeHtml(s.plate_number)}</td>
                <td class="py-3 pr-4">${escapeHtml(s.dock_code)}</td>
                <td class="py-3 pr-4">${pill(statusLabel(s.status), s.status === "completed" ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-100 text-red-800 ring-1 ring-red-200")}</td>
                <td class="py-3 pr-4">${formatDuration(s.duration_seconds)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState("No history records", "Completed/cancelled sessions will show up here.");

  return `
    ${sectionTitle("Loading Sessions")}
    <div class="grid gap-4 lg:grid-cols-2">
      ${card(`<div class="mb-3 flex items-center justify-between"><div class="text-sm font-semibold">Active Sessions (${active.length})</div><button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="refresh-sessions">Refresh</button></div>${activeCards}`)}
      ${card(`<div class="mb-3 flex items-center justify-between"><div class="text-sm font-semibold">Session History (latest 20)</div><button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="export-sessions">Export</button></div>${historyTable}`)}
    </div>
    ${renderCommonModals()}
  `;
}

function attachSessionsHandlers() {
  $("#page [data-action='refresh-sessions']")?.addEventListener("click", () => showToast("Refreshed sessions (demo)", "success"));
  $("#page [data-action='export-sessions']")?.addEventListener("click", () => {
    if (!permissions.exportData(state.me.role)) return showToast("Not allowed: export data", "danger");
    downloadJson("sessions.json", state.sessions);
  });

  $$("#page [data-action='session-view']").forEach((btn) => {
    btn.addEventListener("click", () => showToast("Session detail view not implemented (prototype)", "info"));
  });

  $$("#page [data-action='session-force-stop']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.forceStopSession(state.me.role)) return showToast("Not allowed: force stop session", "danger");
      const id = btn.dataset.id;
      const s = state.sessions.find((x) => x.id === id);
      if (!s) return;
      if (!confirm(`Force stop session for ${s.driver_name}? (demo)`)) return;

      s.status = "cancelled";
      s.finished_at = Date.now();
      s.duration_seconds = (s.finished_at - s.started_at) / 1000;

      pushActivity("🔴", `Session force-stopped for ${s.driver_name} at ${s.dock_code}`);
      showToast(`Session cancelled`, "warning");
      renderApp();
    });
  });
}

/* ----------------------------- History ------------------------------- */

function renderHistory() {
  const items = state.activity.slice().sort((a, b) => b.ts - a.ts);
  return `
    ${sectionTitle("History")}
    ${card(`
      <div class="space-y-2">
        ${items.map((a) => `
          <div class="flex items-start gap-3 rounded-xl bg-gray-100 px-3 py-2">
            <div class="text-base leading-none">${a.icon}</div>
            <div class="min-w-0">
              <div class="text-sm text-gray-900">${escapeHtml(a.text)}</div>
              <div class="text-xs text-gray-500">${formatTime(a.ts)}</div>
            </div>
          </div>
        `).join("")}
        ${items.length ? "" : emptyState("No activity yet", "Actions you take in this prototype will appear here.")}
      </div>
    `)}
  `;
}

/* -------------------------- Notifications ---------------------------- */

function renderNotifications() {
  const canSend = permissions.sendNotifications(state.me.role);

  const list = state.notifications
    .slice()
    .sort((a, b) => b.created_at - a.created_at)
    .map((n) => `
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-semibold">${escapeHtml(n.title)} ${pill(n.type, "bg-gray-100 text-gray-800 ring-1 ring-gray-200")}</div>
            <div class="mt-1 text-sm text-gray-800">${escapeHtml(n.message)}</div>
            <div class="mt-2 text-xs text-gray-500">${formatTime(n.created_at)} • target: <span class="font-semibold text-gray-800">${escapeHtml(n.target)}</span></div>
          </div>
          <button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="ntf-copy" data-id="${n.id}">Copy</button>
        </div>
      </div>
    `).join("");

  const form = `
    <form id="ntf-form" class="${canSend ? "" : "opacity-60 pointer-events-none"}">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-xs font-semibold text-gray-600">Target</label>
          <select name="target" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
            <option value="broadcast">Broadcast (All Drivers)</option>
            <option value="single">Single Driver (demo)</option>
            <option value="multiple">Select Multiple (demo)</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600">Type</label>
          <select name="type" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
            <option value="info">info</option>
            <option value="alert">alert</option>
            <option value="system">system</option>
          </select>
        </div>
      </div>

      <div class="mt-3">
        <label class="text-xs font-semibold text-gray-600">Title</label>
        <input name="title" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Pengumuman Penting" />
      </div>
      <div class="mt-3">
        <label class="text-xs font-semibold text-gray-600">Message</label>
        <textarea name="message" required rows="4" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Tulis pesan notifikasi..."></textarea>
      </div>

      <div class="mt-4 flex items-center justify-end gap-2">
        <button type="button" class="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold hover:bg-gray-200" data-action="ntf-reset">Reset</button>
        <button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]">Send Notification</button>
      </div>

      ${canSend ? "" : `<div class="mt-3 text-xs text-red-700">You are in role <b>${escapeHtml(state.me.role)}</b>. Sending notifications requires <b>owner/admin</b>.</div>`}
    </form>
  `;

  return `
    ${sectionTitle("Notifications")}
    <div class="grid gap-4 lg:grid-cols-2">
      ${card(`<div class="text-sm font-semibold">Send Notification</div><div class="mt-3">${form}</div>`)}
      ${card(`<div class="flex items-center justify-between"><div class="text-sm font-semibold">History</div><button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="ntf-export">Export</button></div><div class="mt-3 space-y-3">${list || emptyState("No notifications", "Create one on the left.")}</div>`)}
    </div>
  `;
}

function attachNotificationsHandlers() {
  $("#ntf-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!permissions.sendNotifications(state.me.role)) return showToast("Not allowed: send notifications", "danger");

    const form = e.target;
    const fd = new FormData(form);

    const n = {
      id: uid("ntf"),
      created_at: Date.now(),
      target: fd.get("target"),
      type: fd.get("type"),
      title: String(fd.get("title") || ""),
      message: String(fd.get("message") || ""),
    };

    state.notifications.unshift(n);
    pushActivity("🔔", `Notification sent: "${n.title}" (${n.type})`);
    showToast("Notification sent (demo)", "success");
    form.reset();
    renderApp();
  });

  $("#page [data-action='ntf-reset']")?.addEventListener("click", () => $("#ntf-form")?.reset());

  $("#page [data-action='ntf-export']")?.addEventListener("click", () => {
    if (!permissions.exportData(state.me.role)) return showToast("Not allowed: export data", "danger");
    downloadJson("notifications.json", state.notifications);
  });

  $$("#page [data-action='ntf-copy']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const n = state.notifications.find((x) => x.id === btn.dataset.id);
      if (!n) return;
      await navigator.clipboard.writeText(`${n.title}\n\n${n.message}`);
      showToast("Copied to clipboard", "success");
    });
  });
}

/* ----------------------------- Cameras ------------------------------- */

function renderCameras() {
  const headActions = `
    <button class="rounded-[14px] bg-[#84CC16] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="open-add-camera">+ Add Camera</button>
  `;

  const rows = state.cameras.map((c) => `
    <tr>
      <td class="py-3 pr-4 font-semibold">${escapeHtml(c.name)}</td>
      <td class="py-3 pr-4 font-mono text-xs">${escapeHtml(c.stream_url || "-")}</td>
      <td class="py-3 pr-4">${escapeHtml(c.dock_code || "-")}</td>
      <td class="py-3 pr-4">${c.online ? pill("online", "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200") : pill("offline", "bg-red-100 text-red-800 ring-1 ring-red-200")}</td>
      <td class="py-3 pr-4">
        <button class="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95" data-action="camera-delete" data-id="${c.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  return `
    ${sectionTitle("Cameras", headActions)}
    ${card(`
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th class="py-3 pr-4">Name</th>
              <th class="py-3 pr-4">Stream URL</th>
              <th class="py-3 pr-4">Dock</th>
              <th class="py-3 pr-4">Status</th>
              <th class="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">${rows || ""}</tbody>
        </table>
      </div>
      ${state.cameras.length ? "" : `<div class="mt-4">${emptyState("No cameras yet", "Add cameras to enable plate detection integrations.")}</div>`}
    `)}
    ${renderCommonModals()}
  `;
}

function attachCamerasHandlers() {
  $("#page [data-action='open-add-camera']")?.addEventListener("click", () => openModal("modal-add-camera"));

  $$("#page [data-action='camera-delete']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.deleteData(state.me.role)) return showToast("Not allowed: delete cameras (owner only)", "danger");
      const id = btn.dataset.id;
      const c = state.cameras.find((x) => x.id === id);
      if (!c) return;
      if (!confirm(`Delete camera ${c.name}? (demo)`)) return;
      state.cameras = state.cameras.filter((x) => x.id !== id);
      pushActivity("🔴", `Camera "${c.name}" deleted`);
      showToast(`Camera "${c.name}" deleted`, "warning");
      renderApp();
    });
  });
}

/* -------------------------- Users & Roles ---------------------------- */

function renderUsers() {
  const canManage = permissions.manageUsers(state.me.role);

  const rows = state.users.map((u) => `
    <tr>
      <td class="py-3 pr-4 font-semibold">${escapeHtml(u.name)}</td>
      <td class="py-3 pr-4">${escapeHtml(u.email)}</td>
      <td class="py-3 pr-4">${pill(u.role, u.role === "owner" ? "bg-[#1A2E35] text-white" : "bg-gray-100 text-gray-800 ring-1 ring-gray-200")}</td>
      <td class="py-3 pr-4">
        <div class="${canManage ? "" : "opacity-50 pointer-events-none"} flex gap-2">
          <button class="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold hover:bg-gray-200" data-action="user-role" data-id="${u.id}">Change role</button>
          <button class="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95" data-action="user-remove" data-id="${u.id}">Remove</button>
        </div>
      </td>
    </tr>
  `).join("");

  const invite = `
    <form id="invite-form" class="${canManage ? "" : "opacity-60 pointer-events-none"}">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <label class="text-xs font-semibold text-gray-600">Email</label>
          <input name="email" required type="email" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="new.admin@example.com" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600">Role</label>
          <select name="role" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
            <option value="admin">admin</option>
            <option value="member">member</option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex justify-end">
        <button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]">Invite</button>
      </div>
      ${canManage ? "" : `<div class="mt-2 text-xs text-red-700">Only <b>owner</b> can manage users.</div>`}
    </form>
  `;

  return `
    ${sectionTitle("Users & Roles")}
    <div class="grid gap-4 lg:grid-cols-2">
      ${card(`<div class="text-sm font-semibold">Invite User</div><div class="mt-3">${invite}</div>`)}
      ${card(`
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">Tenant Users</div>
          <button class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200" data-action="users-export">Export</button>
        </div>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th class="py-3 pr-4">Name</th>
                <th class="py-3 pr-4">Email</th>
                <th class="py-3 pr-4">Role</th>
                <th class="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">${rows || ""}</tbody>
          </table>
        </div>
      `)}
    </div>
  `;
}

function attachUsersHandlers() {
  $("#invite-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!permissions.manageUsers(state.me.role)) return showToast("Not allowed: manage users", "danger");
    const fd = new FormData(e.target);
    const email = String(fd.get("email") || "");
    const role = String(fd.get("role") || "member");
    state.users.push({ id: uid("usr"), name: email.split("@")[0], email, role });
    pushActivity("👥", `User invited: ${email} (${role})`);
    showToast("Invite created (demo)", "success");
    e.target.reset();
    renderApp();
  });

  $("#page [data-action='users-export']")?.addEventListener("click", () => {
    if (!permissions.exportData(state.me.role)) return showToast("Not allowed: export data", "danger");
    downloadJson("users.json", state.users);
  });

  $$("#page [data-action='user-role']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.manageUsers(state.me.role)) return showToast("Not allowed: manage users", "danger");
      const id = btn.dataset.id;
      const u = state.users.find((x) => x.id === id);
      if (!u) return;
      if (u.role === "owner") return showToast("Owner role cannot be changed (demo)", "warning");
      const next = u.role === "admin" ? "member" : "admin";
      u.role = next;
      pushActivity("👥", `User ${u.email} role → ${next}`);
      showToast(`Role updated: ${u.email} → ${next}`, "success");
      renderApp();
    });
  });

  $$("#page [data-action='user-remove']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!permissions.manageUsers(state.me.role)) return showToast("Not allowed: manage users", "danger");
      const id = btn.dataset.id;
      const u = state.users.find((x) => x.id === id);
      if (!u) return;
      if (!confirm(`Remove user ${u.email}? (demo)`)) return;
      state.users = state.users.filter((x) => x.id !== id);
      pushActivity("👥", `User removed: ${u.email}`);
      showToast(`User removed`, "warning");
      renderApp();
    });
  });
}

/* ----------------------------- Settings ------------------------------ */

function renderSettings() {
  const canManage = permissions.manageSettings(state.me.role);

  const { tenant, operational, notification } = state.settings;

  return `
    ${sectionTitle("Settings")}
    <div class="${canManage ? "" : "opacity-60"} grid gap-4 lg:grid-cols-2">
      ${card(`
        <div class="text-sm font-semibold">Tenant Settings</div>
        <form id="settings-tenant" class="mt-3 space-y-3 ${canManage ? "" : "pointer-events-none"}">
          <div>
            <label class="text-xs font-semibold text-gray-600">Name</label>
            <input name="name" value="${escapeHtml(tenant.name)}" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="text-xs font-semibold text-gray-600">Slug</label>
              <input name="slug" value="${escapeHtml(tenant.slug)}" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-600">Plan</label>
              <select name="plan" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
                ${["free","basic","pro","enterprise"].map(p => `<option value="${p}"${p===tenant.plan?" selected":""}>${p}</option>`).join("")}
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600">Timezone</label>
            <input name="timezone" value="${escapeHtml(tenant.timezone)}" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
          </div>
          <div class="flex justify-end">
            <button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]">Save</button>
          </div>
        </form>
      `)}

      ${card(`
        <div class="text-sm font-semibold">Operational Settings</div>
        <form id="settings-operational" class="mt-3 space-y-3 ${canManage ? "" : "pointer-events-none"}">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="text-xs font-semibold text-gray-600">Max loading duration (min)</label>
              <input name="max_loading_duration" type="number" min="1" value="${escapeHtml(operational.max_loading_duration)}" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-600">Alert threshold (min)</label>
              <input name="alert_threshold" type="number" min="1" value="${escapeHtml(operational.alert_threshold)}" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
          </div>

          ${renderToggle("auto_approve_drivers", "Auto-approve new drivers", operational.auto_approve_drivers)}
          ${renderToggle("require_photo", "Require photo on completion", operational.require_photo)}
          ${renderToggle("enable_cctv_detection", "Enable CCTV detection", operational.enable_cctv_detection)}

          <div class="flex justify-end">
            <button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]">Save</button>
          </div>
        </form>
      `)}

      ${card(`
        <div class="text-sm font-semibold">Notification Settings</div>
        <form id="settings-notification" class="mt-3 space-y-3 ${canManage ? "" : "pointer-events-none"}">
          ${renderToggle("email_notifications", "Email notifications", notification.email_notifications)}
          ${renderToggle("sms_notifications", "SMS notifications", notification.sms_notifications)}
          <div>
            <label class="text-xs font-semibold text-gray-600">Alert recipients (comma-separated)</label>
            <input name="alert_recipients" value="${escapeHtml(notification.alert_recipients.join(", "))}" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
          </div>
          <div class="flex justify-end">
            <button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]">Save</button>
          </div>
        </form>
      `)}
    </div>

    ${canManage ? "" : `<div class="mt-4 text-sm text-red-700">Only <b>owner</b> can manage settings.</div>`}
  `;
}

function renderToggle(name, label, checked) {
  return `
    <label class="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <div class="text-sm font-semibold">${escapeHtml(label)}</div>
        <div class="text-xs text-gray-500">Setting key: <span class="font-mono">${escapeHtml(name)}</span></div>
      </div>
      <input type="checkbox" name="${escapeHtml(name)}" ${checked ? "checked" : ""} class="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 focus:border-emerald-500" />
    </label>
  `;
}

function attachSettingsHandlers() {
  const canManage = permissions.manageSettings(state.me.role);

  const onSubmit = (id, fn) => {
    $(id)?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!canManage) return showToast("Not allowed: manage settings", "danger");
      fn(new FormData(e.target));
      showToast("Settings saved (demo)", "success");
      pushActivity("⚙️", "Settings updated");
      renderApp();
    });
  };

  onSubmit("#settings-tenant", (fd) => {
    state.settings.tenant.name = String(fd.get("name") || "");
    state.settings.tenant.slug = String(fd.get("slug") || "");
    state.settings.tenant.plan = String(fd.get("plan") || "");
    state.settings.tenant.timezone = String(fd.get("timezone") || "");
  });

  onSubmit("#settings-operational", (fd) => {
    state.settings.operational.max_loading_duration = Number(fd.get("max_loading_duration") || 0);
    state.settings.operational.alert_threshold = Number(fd.get("alert_threshold") || 0);
    state.settings.operational.auto_approve_drivers = Boolean(fd.get("auto_approve_drivers"));
    state.settings.operational.require_photo = Boolean(fd.get("require_photo"));
    state.settings.operational.enable_cctv_detection = Boolean(fd.get("enable_cctv_detection"));
  });

  onSubmit("#settings-notification", (fd) => {
    state.settings.notification.email_notifications = Boolean(fd.get("email_notifications"));
    state.settings.notification.sms_notifications = Boolean(fd.get("sms_notifications"));
    const raw = String(fd.get("alert_recipients") || "");
    state.settings.notification.alert_recipients = raw.split(",").map((s) => s.trim()).filter(Boolean);
  });
}

/* ----------------------------- Reports ------------------------------- */

function renderReports() {
  const options = [
    { id: "daily", label: "Daily Summary" },
    { id: "weekly", label: "Weekly Performance" },
    { id: "monthly", label: "Monthly Report" },
    { id: "driver", label: "Driver Performance" },
    { id: "dock", label: "Dock Utilization" },
    { id: "loading", label: "Loading Time Analysis" },
  ];
  const selected = sessionStorage.getItem("reports.type") ?? "daily";

  return `
    ${sectionTitle("Reports")}
    <div class="grid gap-4 lg:grid-cols-2">
      ${card(`
        <div class="text-sm font-semibold">Generate Report</div>
        <form id="report-form" class="mt-3 space-y-3">
          <div>
            <label class="text-xs font-semibold text-gray-600">Report Type</label>
            <select name="type" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
              ${options.map(o => `<option value="${o.id}"${o.id===selected?" selected":""}>${escapeHtml(o.label)}</option>`).join("")}
            </select>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="text-xs font-semibold text-gray-600">From</label>
              <input name="from" type="date" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-600">To</label>
              <input name="to" type="date" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold hover:bg-gray-200" data-action="report-export">Export</button>
            <button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]">Generate</button>
          </div>
        </form>
      `)}

      ${card(`
        <div class="text-sm font-semibold">Preview</div>
        <div class="mt-2 text-sm text-gray-600">
          This is a placeholder for report generation. Wire up Supabase queries/RPC later.
        </div>
        <div class="mt-4 rounded-2xl bg-gray-100 p-4 text-sm">
          <div class="font-semibold">Selected:</div>
          <div class="mt-1 font-mono text-xs">${escapeHtml(selected)}</div>
          <div class="mt-3 font-semibold">Suggested output:</div>
          <ul class="mt-2 list-disc pl-5 text-sm text-gray-800">
            <li>Totals: sessions, avg loading time</li>
            <li>Breakdown per dock / per driver</li>
            <li>Export CSV + PDF (future)</li>
          </ul>
        </div>
      `)}
    </div>
  `;
}

function attachReportsHandlers() {
  $("#report-form")?.addEventListener("change", (e) => {
    const form = e.currentTarget;
    const fd = new FormData(form);
    sessionStorage.setItem("reports.type", String(fd.get("type") || "daily"));
    renderApp();
  });

  $("#report-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Generated report (demo)", "success");
    pushActivity("📈", "Report generated (demo)");
  });

  $("#page [data-action='report-export']")?.addEventListener("click", () => {
    if (!permissions.exportData(state.me.role)) return showToast("Not allowed: export data", "danger");
    downloadJson("report-demo.json", { type: sessionStorage.getItem("reports.type") ?? "daily", generated_at: Date.now() });
  });
}

/* ---------------------------- Analytics ------------------------------ */

function renderAnalytics() {
  // lightweight "chart" (SVG bars) from sessions (counts per status)
  const counts = SESSION_STATUSES.reduce((acc, s) => (acc[s] = 0, acc), {});
  for (const s of state.sessions) counts[s.status] = (counts[s.status] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(counts));

  const bars = SESSION_STATUSES.map((s, i) => {
    const v = counts[s] ?? 0;
    const h = Math.round((v / max) * 120);
    const x = 20 + i * 55;
    const y = 150 - h;
    return `
      <g>
        <rect x="${x}" y="${y}" width="34" height="${h}" rx="8"></rect>
        <text x="${x + 17}" y="170" text-anchor="middle" font-size="10">${escapeHtml(s)}</text>
        <text x="${x + 17}" y="${y - 6}" text-anchor="middle" font-size="10">${v}</text>
      </g>
    `;
  }).join("");

  return `
    ${sectionTitle("Analytics")}
    <div class="grid gap-4 lg:grid-cols-3">
      ${card(`
        <div class="text-sm font-semibold">Sessions by Status</div>
        <div class="mt-3 rounded-2xl bg-gray-100 p-3">
          <svg viewBox="0 0 360 190" class="w-full" aria-label="Sessions by status chart" role="img">
            <g fill="currentColor" opacity="0.85">${bars}</g>
          </svg>
          <div class="mt-2 text-xs text-gray-500">Prototype chart (SVG). Replace with Recharts/Chart.js later.</div>
        </div>
      `, "lg:col-span-2")}

      ${card(`
        <div class="text-sm font-semibold">Key Metrics</div>
        <div class="mt-3 space-y-2 text-sm text-gray-800">
          <div class="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2"><span>Total sessions</span><span class="font-semibold">${state.sessions.length}</span></div>
          <div class="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2"><span>Active sessions</span><span class="font-semibold">${state.sessions.filter(s => ["waiting","loading","unloading"].includes(s.status)).length}</span></div>
          <div class="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2"><span>Available docks</span><span class="font-semibold">${state.docks.filter(d => d.status==="available").length}</span></div>
          <div class="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2"><span>Pending driver approvals</span><span class="font-semibold">${state.drivers.filter(d => d.status==="pending_approval").length}</span></div>
        </div>
        <div class="mt-4">
          <button class="w-full rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="analytics-export">Export snapshot</button>
        </div>
      `)}
    </div>
  `;
}

function attachAnalyticsHandlers() {
  $("#page [data-action='analytics-export']")?.addEventListener("click", () => {
    if (!permissions.exportData(state.me.role)) return showToast("Not allowed: export data", "danger");
    downloadJson("analytics-snapshot.json", {
      generated_at: Date.now(),
      tenant: state.tenantId,
      counts: {
        sessions_total: state.sessions.length,
        sessions_active: state.sessions.filter(s => ["waiting","loading","unloading"].includes(s.status)).length,
        docks_available: state.docks.filter(d => d.status==="available").length,
        drivers_pending: state.drivers.filter(d => d.status==="pending_approval").length,
      },
    });
  });
}

/* --------------------------- Modals / Forms --------------------------- */

function openModal(id) {
  const el = $(`#${id}`);
  if (!el) return;
  el.setAttribute("data-hidden", "false");
  // focus first input
  setTimeout(() => {
    const input = el.querySelector("input,select,textarea,button");
    input?.focus?.();
  }, 0);
}

function closeModal(id) {
  const el = $(`#${id}`);
  if (!el) return;
  el.setAttribute("data-hidden", "true");
}

function renderModalShell(id, title, bodyHtml, actionsHtml) {
  return `
    <div id="${escapeHtml(id)}" data-hidden="true" class="fixed inset-0 z-[80]">
      <div class="absolute inset-0 bg-black/40" data-action="modal-close" data-id="${escapeHtml(id)}"></div>
      <div class="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-5 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-base font-semibold">${escapeHtml(title)}</div>
            <div class="mt-1 text-sm text-gray-500">Tenant: ${escapeHtml(state.tenantId)}</div>
          </div>
          <button class="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold hover:bg-gray-200" data-action="modal-close" data-id="${escapeHtml(id)}" aria-label="Close">✕</button>
        </div>

        <div class="mt-4">${bodyHtml}</div>

        <div class="mt-5 flex items-center justify-end gap-2">
          <button class="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold hover:bg-gray-200" data-action="modal-close" data-id="${escapeHtml(id)}">Cancel</button>
          ${actionsHtml}
        </div>
      </div>
    </div>
  `;
}

function renderCommonModals() {
  // Add Driver
  const addDriverBody = `
    <form id="form-add-driver" class="space-y-3">
      <div>
        <label class="text-xs font-semibold text-gray-600">Name</label>
        <input name="name" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Full name" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-xs font-semibold text-gray-600">Phone</label>
          <input name="phone" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="08xxxxxxxxxx" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600">Status</label>
          <select name="status" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
            ${DRIVER_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-xs font-semibold text-gray-600">Email (optional)</label>
          <input name="email" type="email" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="driver@example.com" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600">Company (optional)</label>
          <input name="company_name" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Company name" />
        </div>
      </div>
    </form>
  `;
  const addDriver = renderModalShell(
    "modal-add-driver",
    "Add Driver",
    addDriverBody,
    `<button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="submit-add-driver">Create</button>`,
  );

  // Add Truck
  const addTruckBody = `
    <form id="form-add-truck" class="space-y-3">
      <div>
        <label class="text-xs font-semibold text-gray-600">Plate Number</label>
        <input name="plate_number" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="B 1234 XY" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-xs font-semibold text-gray-600">Vehicle Type</label>
          <select name="vehicle_type" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
            ${VEHICLE_TYPES.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600">Brand/Model</label>
          <input name="brand_model" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Isuzu / Mitsubishi / ..." />
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_registered" checked class="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 focus:border-emerald-500" />
        <span>Registered</span>
      </label>
    </form>
  `;
  const addTruck = renderModalShell(
    "modal-add-truck",
    "Add Truck",
    addTruckBody,
    `<button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="submit-add-truck">Create</button>`,
  );

  // Add Dock
  const addDockBody = `
    <form id="form-add-dock" class="space-y-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-xs font-semibold text-gray-600">Dock Code</label>
          <input name="dock_code" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="D-05" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600">Status</label>
          <select name="status" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
            ${DOCK_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600">Dock Name</label>
        <input name="dock_name" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Dock description" />
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600">Capacity</label>
        <input name="capacity" type="number" min="1" value="1" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
      </div>
    </form>
  `;
  const addDock = renderModalShell(
    "modal-add-dock",
    "Add Dock",
    addDockBody,
    `<button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="submit-add-dock">Create</button>`,
  );

  // Add Helper
  const addHelperBody = `
    <form id="form-add-helper" class="space-y-3">
      <div>
        <label class="text-xs font-semibold text-gray-600">Name</label>
        <input name="name" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Full name" />
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600">Phone</label>
        <input name="phone" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="08xxxxxxxxxx" />
      </div>
    </form>
  `;
  const addHelper = renderModalShell(
    "modal-add-helper",
    "Add Helper",
    addHelperBody,
    `<button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="submit-add-helper">Create</button>`,
  );

  // Add Loader
  const addLoaderBody = `
    <form id="form-add-loader" class="space-y-3">
      <div>
        <label class="text-xs font-semibold text-gray-600">Name</label>
        <input name="name" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Full name" />
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600">Phone</label>
        <input name="phone" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="08xxxxxxxxxx" />
      </div>
    </form>
  `;
  const addLoader = renderModalShell(
    "modal-add-loader",
    "Add Loader",
    addLoaderBody,
    `<button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="submit-add-loader">Create</button>`,
  );

  // Add Camera
  const dockOptions = state.docks.map(d => `<option value="${escapeHtml(d.dock_code)}">${escapeHtml(d.dock_code)} — ${escapeHtml(d.dock_name ?? "")}</option>`).join("");
  const addCameraBody = `
    <form id="form-add-camera" class="space-y-3">
      <div>
        <label class="text-xs font-semibold text-gray-600">Name</label>
        <input name="name" required class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Gate Cam 2" />
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600">Stream URL</label>
        <input name="stream_url" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="rtsp://..." />
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600">Dock</label>
        <select name="dock_code" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
          <option value="">(Not linked)</option>
          ${dockOptions}
        </select>
      </div>
      ${renderToggle("online", "Online", true)}
    </form>
  `;
  const addCamera = renderModalShell(
    "modal-add-camera",
    "Add Camera",
    addCameraBody,
    `<button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="submit-add-camera">Create</button>`,
  );

  return addDriver + addTruck + addDock + addHelper + addLoader + addCamera;
}

function renderModalSetDockStatus() {
  return renderModalShell(
    "modal-set-dock-status",
    "Set Dock Status",
    `
      <form id="form-set-dock-status" class="space-y-3">
        <input type="hidden" name="dock_id" />
        <div>
          <label class="text-xs font-semibold text-gray-600">Status</label>
          <select name="status" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500">
            ${DOCK_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600">Maintenance reason (optional)</label>
          <input name="maintenance_reason" class="mt-1 w-full rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" placeholder="Reason..." />
        </div>
      </form>
    `,
    `<button class="rounded-[14px] bg-[#84CC16] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4D7C0F]" data-action="submit-set-dock-status">Save</button>`,
  );
}

function openDockStatusModal(dock) {
  openModal("modal-set-dock-status");
  const form = $("#form-set-dock-status");
  form.elements.dock_id.value = dock.id;
  form.elements.status.value = dock.status;
  form.elements.maintenance_reason.value = dock.maintenance_reason ?? "";
}

function attachModalHandlers() {
  // close modal
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='modal-close']");
    if (!btn) return;
    closeModal(btn.dataset.id);
  });

  // Submit handlers (use dataset buttons so you can add modals to any page)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "submit-add-driver") {
      if (!permissions.manageDrivers(state.me.role)) return showToast("Not allowed: manage drivers", "danger");

      const form = $("#form-add-driver");
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      if (!name || !phone) return showToast("Name + phone are required", "warning");

      const nextCode = `DRV-${String(state.drivers.length + 1).padStart(4, "0")}`;
      state.drivers.unshift({
        id: uid("drv"),
        driver_code: nextCode,
        name,
        phone,
        email: String(fd.get("email") || ""),
        company_name: String(fd.get("company_name") || ""),
        status: String(fd.get("status") || "active"),
        created_at: Date.now(),
      });
      pushActivity("🟢", `Driver "${name}" created`);
      showToast(`Driver created: ${name}`, "success");
      form.reset();
      closeModal("modal-add-driver");
      renderApp();
    }

    if (action === "submit-add-truck") {
      if (!permissions.manageTrucks(state.me.role)) return showToast("Not allowed: manage trucks", "danger");

      const form = $("#form-add-truck");
      const fd = new FormData(form);
      const plate = String(fd.get("plate_number") || "").trim();
      if (!plate) return showToast("Plate number is required", "warning");

      state.trucks.unshift({
        id: uid("trk"),
        plate_number: plate,
        vehicle_type: String(fd.get("vehicle_type") || ""),
        brand_model: String(fd.get("brand_model") || ""),
        is_registered: Boolean(fd.get("is_registered")),
        created_at: Date.now(),
      });
      pushActivity("🟢", `Truck "${plate}" created`);
      showToast(`Truck created: ${plate}`, "success");
      form.reset();
      closeModal("modal-add-truck");
      renderApp();
    }

    if (action === "submit-add-dock") {
      if (!permissions.manageDocks(state.me.role)) return showToast("Not allowed: manage docks", "danger");

      const form = $("#form-add-dock");
      const fd = new FormData(form);
      const dock_code = String(fd.get("dock_code") || "").trim();
      if (!dock_code) return showToast("Dock code is required", "warning");

      if (state.docks.some((d) => d.dock_code.toLowerCase() === dock_code.toLowerCase())) {
        return showToast("Dock code already exists", "danger");
      }

      state.docks.push({
        id: uid("dock"),
        dock_code,
        dock_name: String(fd.get("dock_name") || ""),
        status: String(fd.get("status") || "available"),
        capacity: Number(fd.get("capacity") || 1),
        maintenance_reason: "",
      });

      pushActivity("🟢", `Dock ${dock_code} created`);
      showToast(`Dock created: ${dock_code}`, "success");
      form.reset();
      closeModal("modal-add-dock");
      renderApp();
    }

    if (action === "submit-add-helper") {
      if (!permissions.manageDrivers(state.me.role)) return showToast("Not allowed", "danger");

      const form = $("#form-add-helper");
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      if (!name || !phone) return showToast("Name + phone required", "warning");

      state.helpers.unshift({ id: uid("hlp"), name, phone, status: "active" });
      pushActivity("🟢", `Helper "${name}" created`);
      showToast(`Helper created: ${name}`, "success");
      form.reset();
      closeModal("modal-add-helper");
      renderApp();
    }

    if (action === "submit-add-loader") {
      if (!permissions.manageDrivers(state.me.role)) return showToast("Not allowed", "danger");

      const form = $("#form-add-loader");
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      if (!name || !phone) return showToast("Name + phone required", "warning");

      state.loaders.unshift({ id: uid("ldr"), name, phone, status: "active" });
      pushActivity("🟢", `Loader "${name}" created`);
      showToast(`Loader created: ${name}`, "success");
      form.reset();
      closeModal("modal-add-loader");
      renderApp();
    }

    if (action === "submit-add-camera") {
      if (!permissions.manageDocks(state.me.role)) return showToast("Not allowed: manage cameras", "danger");

      const form = $("#form-add-camera");
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      if (!name) return showToast("Name required", "warning");

      state.cameras.unshift({
        id: uid("cam"),
        name,
        stream_url: String(fd.get("stream_url") || ""),
        dock_code: String(fd.get("dock_code") || ""),
        online: Boolean(fd.get("online")),
      });
      pushActivity("🟢", `Camera "${name}" created`);
      showToast(`Camera created: ${name}`, "success");
      form.reset();
      closeModal("modal-add-camera");
      renderApp();
    }

    if (action === "submit-set-dock-status") {
      if (!permissions.manageDocks(state.me.role)) return showToast("Not allowed: manage docks", "danger");

      const form = $("#form-set-dock-status");
      const fd = new FormData(form);
      const id = String(fd.get("dock_id") || "");
      const status = String(fd.get("status") || "available");
      const reason = String(fd.get("maintenance_reason") || "");

      const dock = state.docks.find((d) => d.id === id);
      if (!dock) return;

      dock.status = status;
      dock.maintenance_reason = status === "maintenance" ? reason || "Maintenance" : "";
      pushActivity("🟢", `Dock ${dock.dock_code} → ${status}`);
      showToast(`Dock ${dock.dock_code} updated`, "success");

      closeModal("modal-set-dock-status");
      renderApp();
    }
  });
}

function pushActivity(icon, text) {
  state.activity.unshift({ id: uid("act"), ts: Date.now(), icon, text });
}

/* ------------------------------ Export ------------------------------- */

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ----------------------------- Render App ---------------------------- */

function renderPage(key) {
  switch (key) {
    case "dashboard":
      if (!permissions.viewDashboard(state.me.role)) return emptyState("Not allowed", "Your role cannot view dashboard.");
      return renderDashboard();

    case "drivers":
      return renderDrivers();
    case "trucks":
      return renderTrucks();
    case "docks":
      return renderDocks();
    case "helpers":
      return renderPeople("helpers");
    case "loaders":
      return renderPeople("loaders");

    case "sessions":
      return renderSessions();
    case "history":
      return renderHistory();
    case "notifications":
      return renderNotifications();

    case "cameras":
      return renderCameras();
    case "users":
      return renderUsers();
    case "settings":
      return renderSettings();

    case "reports":
      return renderReports();
    case "analytics":
      return renderAnalytics();

    default:
      return renderDashboard();
  }
}

function attachPageHandlers(key) {
  switch (key) {
    case "dashboard":
      return attachDashboardHandlers();

    case "drivers":
      return attachDriversHandlers();
    case "trucks":
      return attachTrucksHandlers();
    case "docks":
      return attachDocksHandlers();
    case "helpers":
    case "loaders":
      return attachPeopleHandlers();

    case "sessions":
      return attachSessionsHandlers();
    case "notifications":
      return attachNotificationsHandlers();
    case "users":
      return attachUsersHandlers();
    case "settings":
      return attachSettingsHandlers();
    case "reports":
      return attachReportsHandlers();
    case "analytics":
      return attachAnalyticsHandlers();

    default:
      return;
  }
}

function renderApp() {
  const activeKey = getRouteKeyFromHash();
  const app = $("#app");
  app.innerHTML = renderLayout(activeKey);
  attachLayoutHandlers();

  $("#page").innerHTML = renderPage(activeKey);
  attachPageHandlers(activeKey);

  // Modals are rendered by some pages; attach once after render
  attachModalHandlers();
}

// initial route default
if (!location.hash) location.hash = "#/dashboard";
window.addEventListener("hashchange", () => renderApp());
renderApp();
