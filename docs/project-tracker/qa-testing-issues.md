# QA & Testing Engineer Issue Tracker - Complete Inventory

**Last Updated:** 6 Februari 2026 (Verified by QA Engineer Mode)
**Total Issues:** 24
**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Summary

| Category | Total | Done | Pending | In Progress |
|----------|-------|------|---------|-------------|
| Testing Infrastructure | 6 | 3 | 2 | 1 |
| Frontend Tests | 5 | 1 | 4 | 0 |
| Backend Tests | 5 | 0 | 4 | 1 |
| E2E Tests | 4 | 1 | 3 | 0 |
| Quality Gates | 4 | 1 | 3 | 0 |
| **TOTAL** | **24** | **6** | **16** | **2** |

---

## Current Test Coverage Status

```
┌─────────────────────────────────────────────────┐
│           CURRENT TEST COVERAGE                  │
├─────────────────────────────────────────────────┤
│                                                 │
│   Frontend:  ░░░░░░░░░░░░░░░░░░░░ ~0%          │
│   Backend:   ░░░░░░░░░░░░░░░░░░░░ ~0%          │
│   E2E:       ░░░░░░░░░░░░░░░░░░░░ ~0%          │
│                                                 │
│   Target:    ████████████░░░░░░░░ 60-80%       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Section A: Testing Infrastructure (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | ESLint configuration for frontend | ✅ Done | - | [`dashboard/eslint.config.js`](../../dashboard/eslint.config.js) |
| 2 | Setup Vitest + React Testing Library for frontend | 🔄 In Progress | 🔴 High | Tests written in [`tests/hooks/useSupabaseTable.test.js`](../../tests/hooks/useSupabaseTable.test.js) but Vitest not in package.json yet |
| 3 | Setup pytest for backend | ✅ Done | - | Python test files exist in [`tests/integration/`](../../tests/integration/); pytest in requirements.txt |
| 4 | Configure coverage reporting | ⏳ Pending | 🔴 High | Track test coverage metrics |
| 5 | Integrate tests in CI pipeline | ⏳ Pending | 🟡 Medium | Run tests on PR |
| 6 | Setup API mocking (Supabase) | ✅ Done | - | Custom Supabase mock in [`tests/mocks/supabaseMock.js`](../../tests/mocks/supabaseMock.js) (342 lines) |

---

## Section B: Frontend Tests (5)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 7 | Write unit tests for StatsCard component | ⏳ Pending | 🔴 High | Critical component |
| 8 | Write unit tests for CCTVFeed component | ⏳ Pending | 🔴 High | Critical component |
| 9 | Write unit tests for ActivityLog component | ⏳ Pending | 🔴 High | Critical component |
| 10 | Write hook tests for useWebSocket | ⏳ Pending | 🟡 Medium | Real-time data handling |
| 11 | Write hook tests for useSupabaseTable | ✅ Done | - | Comprehensive tests in [`tests/hooks/useSupabaseTable.test.js`](../../tests/hooks/useSupabaseTable.test.js) with INSERT/UPDATE/DELETE/Error handling |

---

## Section C: Backend Tests (5)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 12 | Write unit tests for Detector module | ⏳ Pending | 🟡 Medium | `detector.py` |
| 13 | Write unit tests for Scanner module | ⏳ Pending | 🟡 Medium | `scanner.py` |
| 14 | Write unit tests for Uploader module | ⏳ Pending | 🟡 Medium | `uploader.py` |
| 15 | Write API endpoint tests | ⏳ Pending | 🔴 High | Test all /api/* endpoints |
| 16 | Write WebSocket/Session integration tests | 🔄 In Progress | 🟡 Medium | Tests in [`tests/integration/test_session_listener.py`](../../tests/integration/test_session_listener.py) and [`test_loading_dashboard_flow.py`](../../tests/integration/test_loading_dashboard_flow.py) |

---

## Section D: E2E Tests (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 17 | Setup Playwright/Cypress for E2E | ⏳ Pending | 🟡 Medium | E2E test framework |
| 18 | Write E2E for authentication flow | ⏳ Pending | 🟡 Medium | Login → Dashboard → Logout |
| 19 | Write E2E for dashboard monitoring flow | ⏳ Pending | 🟡 Medium | Dashboard → Camera → Activity |
| 20 | Write E2E for critical user journeys | ✅ Done | - | Manual E2E script in [`tests/e2e/test_full_flow_manual.py`](../../tests/e2e/test_full_flow_manual.py) |

---

## Section E: Quality Gates (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 21 | Setup pre-commit linting hook | ⏳ Pending | 🟡 Medium | Enforce before commit |
| 22 | Setup pre-commit type checking | ⏳ Pending | 🟡 Medium | TypeScript/Python hints |
| 23 | Define coverage thresholds | ⏳ Pending | 🟡 Medium | Fail if coverage drops |
| 24 | Formalize manual test procedures | ✅ Done | - | Comprehensive docs: [`tests/README.md`](../../tests/README.md), [`tests/TEST_PLAN_DASHBOARD_ENGINE.md`](../../tests/TEST_PLAN_DASHBOARD_ENGINE.md), [`tests/MOCK_LOADING_DASHBOARD_TEST_GUIDE.md`](../../tests/MOCK_LOADING_DASHBOARD_TEST_GUIDE.md) |

---

## Manual Test Scenarios (Documented)

### Detection System Tests

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| DT-01 | Truk masuk ke area loading dock | Terdeteksi sebagai "truck" | ✅ Verified |
| DT-02 | Barang melewati garis loading | Counter increment +1 | ✅ Verified |
| DT-03 | Barang melewati garis rehab | Rehab counter +1 | ✅ Verified |
| DT-04 | QR code scanned | Plate number extracted | ✅ Verified |
| DT-05 | Data upload ke Google Sheets | Row added correctly | ✅ Verified |
| DT-06 | Koneksi camera terputus | Graceful reconnect | ⚠️ Partial |
| DT-07 | Internet terputus | Data queued for retry | ✅ Verified |
| DT-08 | Multiple objects detection | All objects tracked | ✅ Verified |

### Dashboard Tests

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| DB-01 | Dashboard loads | All components render | ✅ Verified |
| DB-02 | Real-time stats update | WebSocket updates | ✅ Verified |
| DB-03 | Video stream display | MJPEG plays smoothly | ✅ Verified |
| DB-04 | Activity log update | New entries appear | ✅ Verified |
| DB-05 | Responsive on mobile | Layout adjusts | ✅ Verified |
| DB-06 | Login/Logout | Auth works correctly | ✅ Verified |
| DB-07 | Protected routes | Redirect if not auth | ✅ Verified |
| DB-08 | Error handling | Error states shown | ⚠️ Partial |
| DB-09 | WebSocket disconnect | Reconnection attempt | ⚠️ Partial |

### API Tests

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| API-01 | GET /api/status | 200 + JSON status | ✅ Verified |
| API-02 | GET /api/stats | 200 + JSON stats | ✅ Verified |
| API-03 | GET /api/activities | 200 + JSON array | ✅ Verified |
| API-04 | GET /api/stream/video | MJPEG stream | ✅ Verified |
| API-05 | Invalid endpoint | 404 response | ⚠️ Not tested |
| API-06 | Error handling | Proper error JSON | ⚠️ Not tested |

---

## Known Issues & Bugs

### Open Issues

| ID | Severity | Component | Description | Status |
|----|----------|-----------|-------------|--------|
| BUG-01 | 🟡 Medium | Dashboard | WebSocket reconnect sometimes fails | Open |
| BUG-02 | 🟢 Low | Dashboard | Loading spinner flickers | Open |
| BUG-03 | 🟡 Medium | Detection | Occasional false positive | Investigating |
| BUG-04 | 🟢 Low | API | No proper error response format | Open |

### Resolved Issues

| ID | Description | Resolution Date |
|----|-------------|-----------------|
| BUG-R01 | Stats display wrong value | 13 Jan 2026 |
| BUG-R02 | Loading dock status incorrect | 18 Jan 2026 |
| BUG-R03 | Icon missing on stats card | 17 Jan 2026 |

---

## Proposed Test Structure

### Frontend

```
dashboard/
├── src/
│   ├── components/
│   │   ├── CCTVFeed.jsx
│   │   └── CCTVFeed.test.jsx       # Component test
│   ├── hooks/
│   │   ├── useWebSocket.js
│   │   └── useWebSocket.test.js    # Hook test
│   └── services/
│       ├── api.js
│       └── api.test.js             # Service test
├── tests/
│   ├── e2e/
│   │   ├── dashboard.spec.js       # E2E tests
│   │   └── auth.spec.js
│   └── setup.js                    # Test setup
├── jest.config.js
└── playwright.config.js
```

### Backend

```
gui_version_testing_with_server/
├── src/
│   └── ...
└── tests/
    ├── __init__.py
    ├── conftest.py                 # Fixtures
    ├── unit/
    │   ├── test_detector.py
    │   ├── test_scanner.py
    │   └── test_uploader.py
    ├── integration/
    │   ├── test_api.py
    │   └── test_websocket.py
    └── e2e/
        └── test_full_workflow.py
```

---

## Coverage Targets

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| Frontend Components | 0% | 70% | High |
| Frontend Hooks | 0% | 80% | High |
| Backend Detection | 0% | 60% | Medium |
| Backend API | 0% | 80% | High |
| E2E Flows | 0% | 50% | Medium |

---

## Testing Maturity Model

### Current Level: 1 (Initial)

| Level | Description | Status |
|-------|-------------|--------|
| 1 | Initial - Ad-hoc testing | ✅ Current |
| 2 | Managed - Basic unit tests | ⏳ Target |
| 3 | Defined - Comprehensive suite | Future |
| 4 | Measured - Coverage tracking | Future |
| 5 | Optimized - Continuous improvement | Future |

---

## Testing Roadmap

### Phase 1: Foundation (Week 1-2)
| Priority | Task | Effort |
|----------|------|--------|
| 🔴 High | Setup Jest + RTL for frontend | Low |
| 🔴 High | Setup pytest for backend | Low |
| 🔴 High | Write first 10 unit tests | Medium |
| 🔴 High | Configure coverage reporting | Low |

### Phase 2: Core Coverage (Week 3-4)
| Priority | Task | Effort |
|----------|------|--------|
| 🟡 Medium | Test all API endpoints | Medium |
| 🟡 Medium | Test critical React components | Medium |
| 🟡 Medium | Add WebSocket tests | Medium |
| 🟡 Medium | Integrate tests in CI | Low |

### Phase 3: E2E & Polish (Month 2)
| Priority | Task | Effort |
|----------|------|--------|
| 🟡 Medium | Setup Playwright | Medium |
| 🟡 Medium | E2E for critical flows | High |
| 🟢 Low | Performance testing | Medium |
| 🟢 Low | Visual regression testing | High |

---

## Sources

This inventory was compiled from:
- [`docs/laporan-per-role/06_QA_Testing_Engineer.md`](../laporan-per-role/06_QA_Testing_Engineer.md)
- Manual testing observations
- Codebase analysis

---

## GitHub Projects Labels

Recommended labels for these issues:
- `testing`
- `qa`
- `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
- `type:unit-test` / `type:integration-test` / `type:e2e-test`
- `coverage`
- `status:done` / `status:in-progress` / `status:pending`
