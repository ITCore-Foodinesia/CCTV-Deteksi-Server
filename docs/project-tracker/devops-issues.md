# DevOps Engineer Issue Tracker - Complete Inventory

**Last Updated:** 6 Februari 2026  
**Total Issues:** 26  
**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Summary

| Category | Total | Done | Pending |
|----------|-------|------|---------|
| Environment & Infrastructure | 6 | 5 | 1 |
| Startup Scripts | 6 | 6 | 0 |
| CI/CD Pipeline | 5 | 1 | 4 |
| Containerization | 3 | 0 | 3 |
| Monitoring & Logging | 4 | 1 | 3 |
| Backup & DR | 2 | 0 | 2 |
| **TOTAL** | **26** | **13** | **13** |

---

## Section A: Environment & Infrastructure (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | Setup local development environment | ✅ Done | - | Python 3.11+, Node.js, NVIDIA GPU drivers |
| 2 | Configure hardware (GPU, CUDA, TensorRT) | ✅ Done | - | RTX 3060+ recommended, CUDA 11.8+ |
| 3 | Setup Vercel for frontend deployment | ✅ Done | - | [`dashboard/vercel.json`](../../dashboard/vercel.json) configured |
| 4 | Configure .env files for secrets management | ✅ Done | - | `.env.example` provided for dashboard |
| 5 | Setup .gitignore for sensitive files | ✅ Done | - | Credentials, logs, .env files excluded |
| 6 | Document hardware requirements | ⏳ Pending | 🟢 Low | Min/recommended specs in README |

---

## Section B: Startup Scripts (6) ✅

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 7 | Create start_control_panel.bat | ✅ Done | - | Launch Tkinter GUI |
| 8 | Create start_telegram_bot.bat | ✅ Done | - | Start Telegram bot |
| 9 | Create start_multiprocess_test.bat | ✅ Done | - | Start V3 modular engine (port 5002) |
| 10 | Create start_unified_server.bat | ✅ Done | - | Start unified API server (port 5001) |
| 11 | Create start_test_stream.bat | ✅ Done | - | Test video streaming |
| 12 | Create rebuild_engine.py | ✅ Done | - | Rebuild TensorRT engine |

---

## Section C: CI/CD Pipeline (5)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 13 | Vercel auto-deploy on push (frontend) | ✅ Done | - | Connected to Git, auto-deploys |
| 14 | Setup GitHub Actions for frontend (lint, build) | ⏳ Pending | 🔴 High | No CI for PRs currently |
| 15 | Setup GitHub Actions for backend (pytest) | ⏳ Pending | 🔴 High | No backend tests in CI |
| 16 | Setup automated backend deployment | ⏳ Pending | 🟡 Medium | Currently manual SSH + restart |
| 17 | Add pre-commit hooks (lint, type check) | ⏳ Pending | 🟡 Medium | Enforce quality before commit |

---

## Section D: Containerization (3)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 18 | Create Dockerfile for backend | ⏳ Pending | 🔴 High | NVIDIA CUDA base image needed |
| 19 | Create docker-compose.yml | ⏳ Pending | 🔴 High | GPU passthrough configuration |
| 20 | Document Docker deployment steps | ⏳ Pending | 🟡 Medium | Build, run, GPU config instructions |

---

## Section E: Monitoring & Logging (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 21 | Basic system monitoring (psutil, GPUtil) | ✅ Done | - | In-app via Telegram bot |
| 22 | Setup centralized logging (ELK/Loki) | ⏳ Pending | 🟡 Medium | Currently console/file only |
| 23 | Setup metrics dashboard (Grafana) | ⏳ Pending | 🟡 Medium | Visualize CPU/GPU/API metrics |
| 24 | Setup uptime monitoring (UptimeRobot) | ⏳ Pending | 🟢 Low | Alert on service down |

---

## Section F: Backup & Disaster Recovery (2)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 25 | Implement automated backup strategy | ⏳ Pending | 🔴 High | Config files, local state, AI models |
| 26 | Document disaster recovery plan | ⏳ Pending | 🟡 Medium | RTO/RPO targets, recovery steps |

---

## Infrastructure Overview

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE DIAGRAM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    LOCAL SERVER                          │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│   │  │ Detection    │  │ API Server   │  │ Telegram     │   │  │
│   │  │ Engine       │  │ (Flask)      │  │ Bot          │   │  │
│   │  │ (Python)     │  │ Port: 5001   │  │              │   │  │
│   │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│   │         │                  │                  │          │  │
│   │  ┌──────────────┐  ┌──────────────┐                     │  │
│   │  │ NVIDIA GPU   │  │ RTSP Camera  │                     │  │
│   │  │ (TensorRT)   │  │ Streams      │                     │  │
│   │  └──────────────┘  └──────────────┘                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            │ Internet                           │
│                            ↓                                    │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    CLOUD SERVICES                        │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│   │  │ Vercel       │  │ Google       │  │ Supabase     │   │  │
│   │  │ (Frontend)   │  │ Sheets       │  │ (Auth + DB)  │   │  │
│   │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Summary

| Component | Development | Production |
|-----------|-------------|------------|
| Frontend | localhost:5173 | Vercel |
| Backend | localhost:5001 | Local Server |
| Database | Google Sheets + Supabase | Same |
| AI Processing | Local GPU | Local GPU |

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| GPU | GTX 1060 | RTX 3060+ |
| Storage | 50 GB SSD | 100 GB NVMe |
| CUDA | 11.8+ | 12.0+ |

---

## Proposed CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (proposed)
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd dashboard && npm ci
      - run: cd dashboard && npm run lint
      - run: cd dashboard && npm run build

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - run: pytest tests/

  deploy:
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      # Deploy steps...
```

---

## Proposed Dockerfile

```dockerfile
# Dockerfile (proposed)
FROM nvidia/cuda:12.0-runtime-ubuntu22.04

WORKDIR /app

# Install Python
RUN apt-get update && apt-get install -y python3.11 python3-pip

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy source
COPY src/ ./src/
COPY models/ ./models/
COPY config/ ./config/

# Expose port
EXPOSE 5001

# Run
CMD ["python", "src/unified_server/main.py"]
```

---

## Infrastructure Roadmap

### Phase 1: Foundation (Current + Quick Wins)
- ✅ Vercel for frontend
- ⏳ Add CI/CD pipeline
- ⏳ Containerize backend
- ⏳ Backup automation

### Phase 2: Reliability
- ⏳ Health check endpoints
- ⏳ Centralized logging (Loki/ELK)
- ⏳ Metrics + Grafana
- ⏳ Automated alerts

### Phase 3: Scalability
- ⏳ Kubernetes deployment
- ⏳ Auto-scaling
- ⏳ Multi-region (if needed)
- ⏳ CDN for static assets

---

## Sources

This inventory was compiled from:
- [`docs/laporan-per-role/04_DevOps_Engineer.md`](../laporan-per-role/04_DevOps_Engineer.md)
- [`gui_version_testing_with_server/scripts/`](../../gui_version_testing_with_server/scripts/)
- [`dashboard/vercel.json`](../../dashboard/vercel.json)

---

## GitHub Projects Labels

Recommended labels for these issues:
- `devops`
- `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
- `type:infra` / `type:ci-cd` / `type:monitoring`
- `docker`
- `automation`
- `status:done` / `status:in-progress` / `status:pending`
