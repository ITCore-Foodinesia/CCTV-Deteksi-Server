# Cybersecurity Engineer Issue Tracker - Complete Inventory

**Last Updated:** 6 Februari 2026 (Verified by Cybersecurity Engineer Mode)
**Total Issues:** 32
**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Summary

| Category | Total | Done | Pending |
|----------|-------|------|---------|
| Authentication & Authorization | 6 | 4 | 2 |
| Secrets Management | 4 | 3 | 1 |
| Network Security | 3 | 1 | 2 |
| OWASP Top 10 Mitigations | 10 | 3 | 7 |
| Security Operations | 5 | 1 | 4 |
| Compliance & Documentation | 4 | 0 | 4 |
| **TOTAL** | **32** | **12** | **20** |

---

## Section A: Authentication & Authorization (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | Supabase Auth for dashboard | ✅ Done | - | Email/password authentication implemented |
| 2 | Telegram Bot token-based auth | ✅ Done | - | Bot API token configured |
| 3 | Google Service Account auth | ✅ Done | - | `credentials.json` for Sheets API |
| 4 | Implement API authentication (JWT/API keys) | ⏳ Pending | 🔴 Critical | **NO AUTH ON API** - anyone can access |
| 5 | Implement Multi-Factor Authentication (MFA) | ⏳ Pending | 🟢 Low | Consider for admin accounts |
| 6 | Review Row Level Security (RLS) policies | ✅ Done | - | Comprehensive RLS implemented in [`001_saas_ready_schema.sql`](../../dashboard/supabase/migrations/001_saas_ready_schema.sql:226) |

---

## Section B: Secrets Management (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 7 | Gitignore credentials.json | ✅ Done | - | Protected in `.gitignore` |
| 8 | Gitignore .env files | ✅ Done | - | Frontend + backend env files excluded |
| 9 | Gitignore .pem and .key files | ✅ Done | - | Certificate files protected |
| 10 | Move hardcoded Telegram token to env vars | ⏳ Pending | 🔴 Critical | Token may be hardcoded in source |

---

## Section C: Network Security (3)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 11 | HTTPS enabled for Vercel frontend | ✅ Done | - | Vercel default |
| 12 | Restrict CORS origins | ⏳ Pending | 🔴 High | Currently `CORS(app)` allows all origins |
| 13 | RTSP password handling | ⏳ Pending | 🟡 Medium | Passwords in RTSP URLs |

---

## Section D: OWASP Top 10 Mitigations (10)

| # | Issue | Status | Priority | OWASP | Notes |
|---|-------|--------|----------|-------|-------|
| 14 | A01 - API authentication | ⏳ Pending | 🔴 Critical | Broken Access Control | No auth on API endpoints |
| 15 | A01 - Rate limiting | ⏳ Pending | 🟡 Medium | Broken Access Control | DoS protection needed |
| 16 | A02 - HTTPS enforcement in production | ⏳ Pending | 🟡 Medium | Cryptographic Failures | Backend needs TLS |
| 17 | A03 - XSS prevention | ✅ Done | - | Injection | React escapes by default |
| 18 | A03 - SQL injection prevention | ✅ Done | - | Injection | Using Supabase ORM |
| 19 | A04 - Input validation on API | ⏳ Pending | 🟡 Medium | Insecure Design | Validate request payloads |
| 20 | A04 - Request size limits | ⏳ Pending | 🟡 Medium | Insecure Design | Prevent large payloads |
| 21 | A05 - Debug mode in production | ✅ Done | - | Security Misconfiguration | All servers use `debug=False` verified in [`main.py`](../../gui_version_testing_with_server/src/unified_server/main.py:376) |
| 22 | A06 - Dependency audit (npm) | ⏳ Pending | 🟡 Medium | Vulnerable Components | Run `npm audit` |
| 23 | A06 - Dependency audit (pip) | ⏳ Pending | 🟡 Medium | Vulnerable Components | Run `pip-audit` |

---

## Section E: Security Operations (5)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 24 | Add security headers (X-Content-Type, X-Frame-Options, CSP) | ✅ Done | - | Frontend implemented in [`vercel.json`](../../dashboard/vercel.json:13): X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy. Backend still needs Flask-Talisman. |
| 25 | Implement security event logging | ⏳ Pending | 🟡 Medium | Track auth failures, suspicious activity |
| 26 | Implement audit trail | ⏳ Pending | 🟡 Medium | Track data access and modifications |
| 27 | Setup SAST (Static Application Security Testing) | ⏳ Pending | 🟢 Low | Code scanning in CI |
| 28 | Conduct penetration testing | ⏳ Pending | 🟢 Low | Professional security assessment |

---

## Section F: Compliance & Documentation (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 29 | Create incident response plan | ⏳ Pending | 🟡 Medium | Detection, containment, recovery steps |
| 30 | Document data retention policy | ⏳ Pending | 🟢 Low | GDPR consideration |
| 31 | Create privacy policy | ⏳ Pending | 🟢 Low | User data handling disclosure |
| 32 | OWASP compliance assessment | ⏳ Pending | 🟢 Low | Full OWASP Top 10 review |

---

## Identified Vulnerabilities

### Critical 🔴

| ID | Vulnerability | Impact | Recommendation |
|----|---------------|--------|----------------|
| C1 | No API authentication | Unauthorized access to system | Implement JWT/API keys |
| C2 | Hardcoded credentials | Credential exposure | Use environment variables |

### High 🟡

| ID | Vulnerability | Impact | Recommendation |
|----|---------------|--------|----------------|
| H1 | Open CORS | Cross-origin attacks | Restrict to known origins |
| H2 | No rate limiting | DoS vulnerability | Implement rate limits |
| H3 | No security logging | Blind to attacks | Implement audit logs |

### Medium 🟠

| ID | Vulnerability | Impact | Recommendation |
|----|---------------|--------|----------------|
| M1 | RTSP passwords in URLs | Credential exposure | Use secrets manager |
| M2 | Debug info leakage | Information disclosure | Disable in production |
| M3 | No security headers | Various attacks | Add security headers |
| M4 | Outdated dependencies | Known vulnerabilities | Run audits |

### Low 🟢

| ID | Vulnerability | Impact | Recommendation |
|----|---------------|--------|----------------|
| L1 | No MFA | Account takeover | Consider for admin |
| L2 | No encryption at rest | Data exposure | Encrypt sensitive data |

---

## Recommended Security Headers

### Frontend (Vercel)

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'" }
      ]
    }
  ]
}
```

### Backend (Flask)

```python
from flask_talisman import Talisman

Talisman(app, 
    force_https=True,
    content_security_policy={
        'default-src': "'self'",
        'img-src': '*',
        'script-src': "'self'"
    }
)
```

---

## Security Checklist Summary

### Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| ✅ Credentials not in Git | Yes | Gitignored |
| ⚠️ HTTPS enabled | Dev only | Production needs review |
| ❌ Firewall configured | Unknown | Review needed |
| ❌ Network segmentation | No | Single network |

### Application
| Item | Status | Notes |
|------|--------|-------|
| ❌ API authentication | No | **Critical** |
| ❌ Rate limiting | No | Needed |
| ⚠️ Input validation | Partial | Improve |
| ⚠️ Error handling | Partial | May leak info |
| ❌ Security headers | No | Implement |

### Data
| Item | Status | Notes |
|------|--------|-------|
| ✅ Auth credentials secure | Yes | Supabase |
| ⚠️ PII handling | Partial | Driver names plain |
| ❌ Data encryption | No | Not implemented |
| ❌ Audit logging | No | Implement |

### Operations
| Item | Status | Notes |
|------|--------|-------|
| ❌ Dependency scanning | No | Setup needed |
| ❌ Secret scanning | No | Setup needed |
| ❌ SAST | No | Setup needed |
| ❌ Penetration testing | No | Not performed |

---

## Security Improvement Roadmap

### Phase 1: Foundation (Week 1-2)
- ⏳ API authentication
- ⏳ Secrets management
- ⏳ Dependency auditing
- ⏳ Security headers

### Phase 2: Detection (Month 1)
- ⏳ Security logging
- ⏳ Audit trails
- ⏳ Alerting

### Phase 3: Advanced (Month 2-3)
- ⏳ Penetration testing
- ⏳ Bug bounty (if applicable)
- ⏳ Security training
- ⏳ Compliance certification

---

## Sources

This inventory was compiled from:
- [`docs/laporan-per-role/05_Cybersecurity_Engineer.md`](../laporan-per-role/05_Cybersecurity_Engineer.md)
- OWASP Top 10 2021 checklist
- Codebase security analysis

---

## GitHub Projects Labels

Recommended labels for these issues:
- `security`
- `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
- `type:vulnerability` / `type:hardening` / `type:compliance`
- `owasp`
- `auth`
- `status:done` / `status:in-progress` / `status:pending`
