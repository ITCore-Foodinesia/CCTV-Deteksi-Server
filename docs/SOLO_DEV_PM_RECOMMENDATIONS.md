# Rekomendasi Project Management Tools untuk Solo Dev + AI/MCP

> **Fokus**: Tools yang ringan untuk solo developer dan memiliki integrasi AI serta MCP (Model Context Protocol).

---

## Daftar Isi

1. [Perbandingan Tools](#1-perbandingan-tools)
2. [Rekomendasi Utama](#2-rekomendasi-utama)
3. [Alternatif](#3-alternatif)
4. [Kriteria Evaluasi](#4-kriteria-evaluasi)
5. [Setup yang Disarankan](#5-setup-yang-disarankan)

---

## 1. Perbandingan Tools

### Tools dengan MCP Official Support

| Tool                      | MCP Support | AI Integration | Solo Dev Friendly | Free Tier |
|---------------------------|-------------|----------------|-------------------|-----------|
| **Linear** | ✅ Official | ✅ Built-in AI | ⚠️ Team-oriented | ✅ Free untuk starter |
| **GitHub Issues/Projects** | ✅ Via Playwright MCP | ✅ Copilot | ✅ Excellent | ✅ Free |
| **Notion** | ❌ Tidak ada | ✅ Notion AI | ✅ Excellent | ✅ Free |
| **Todoist** | ❌ Tidak ada | ❌ | ✅ Excellent | ✅ Free |
| **Jira** | ❌ Tidak ada | ⚠️ Limited | ❌ Overkill | ✅ Free starter |
| **ClickUp** | ❌ Tidak ada | ✅ ClickUp Brain | ⚠️ Complex | ✅ Free |
| **Trello** | ❌ Tidak ada | ⚠️ Butler | ✅ Simple | ✅ Free |

### Tools dengan Community MCP

| Tool | MCP Status | Notes |
|------|------------|-------|
| **Supabase** | ✅ Official MCP | Database + Auth, excellent for solo devs |
| **Memory** | ✅ Official MCP | Knowledge graph for project context |
| **Sequential Thinking** | ✅ Official MCP | For complex problem breakdown |
| **Playwright** | ✅ Official MCP | Browser automation, can access any web app |

---

## 2. Rekomendasi Utama

### 🥇 Untuk Solo Dev yang Sudah Pakai Linear

**Tetap pakai Linear** karena:
- ✅ MCP sudah official dan stabil
- ✅ AI bisa create/update issues langsung dari editor
- ✅ Keyboard-first design (cepat untuk solo dev)
- ✅ Git integration bagus
- ✅ Free tier cukup untuk solo/small team

**Workflow yang Disarankan:**
```
Coding → Temukan Bug → "Buatkan issue untuk bug X" → Lanjut Coding
         ↓
      Review → "Tampilkan issues hari ini" → Prioritas
```

### 🥈 Untuk Solo Dev yang Mau Simpel

**GitHub Issues + GitHub Projects**

**Kelebihan:**
- ✅ Sudah terintegrasi dengan repo
- ✅ Copilot bisa membantu
- ✅ Gratis unlimited untuk public repo
- ✅ Tidak perlu tool terpisah
- ✅ Bisa diakses via Playwright MCP

**Kekurangan:**
- ❌ Tidak ada native MCP (perlu Playwright workaround)
- ❌ UI kurang smooth dibanding Linear

### 🥉 Untuk Solo Dev yang Butuh Dokumentasi + PM

**Notion + Supabase**

**Kelebihan:**
- ✅ All-in-one: docs, database, wiki, tasks
- ✅ Notion AI untuk generate content
- ✅ Supabase MCP untuk database operations
- ✅ Flexible untuk berbagai use case

**Kekurangan:**
- ❌ Notion tidak punya MCP (harus manual atau Playwright)
- ❌ Bisa jadi terlalu flexible (overwhelm)

---

## 3. Alternatif

### Plain Text / Markdown-based

Jika tidak mau dependency pada external tools:

| Approach | MCP Compatible | Tools |
|----------|----------------|-------|
| **TODO.md in repo** | ✅ Via filesystem MCP | Just markdown files |
| **Obsidian** | ⚠️ Community plugins | Local-first, plugin ecosystem |
| **Logseq** | ❌ | Local-first, outliner |

**Kelebihan:**
- Offline-first
- No vendor lock-in
- AI bisa langsung edit via file tools

**Kekurangan:**
- Tidak ada visualisasi board/timeline
- Manual sync jika multi-device

### Command-Line First

Untuk developer yang prefer terminal:

| Tool | Description |
|------|-------------|
| **Taskwarrior** | CLI task manager |
| **todo.txt** | Plain text format |
| **GitHub CLI** | `gh issue create` |

---

## 4. Kriteria Evaluasi

### Untuk Solo Dev, Prioritaskan:

| Kriteria | Mengapa Penting |
|----------|-----------------|
| **Speed** | Solo dev = context switching mahal. Tool harus cepat. |
| **Simplicity** | Tidak perlu fitur team collaboration yang kompleks |
| **AI Integration** | Automasi repetitive tasks |
| **MCP Support** | Kontrol dari editor = fewer distractions |
| **Free Tier** | Budget-conscious |
| **Git Integration** | Link code ↔ tasks |

### Red Flags untuk Solo Dev:

❌ Terlalu banyak fitur team (approvals, multiple workflows)  
❌ Onboarding panjang  
❌ Pricing per-seat yang mahal  
❌ Tidak ada API/automation  

---

## 5. Setup yang Disarankan

### Setup A: Minimalis (Linear + MCP)

Untuk solo dev yang mau fokus coding:

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code / Cursor                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Linear    │  │  Supabase   │  │   Memory    │          │
│  │    MCP      │  │    MCP      │  │    MCP      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│  ┌─────────────────────────────────────────────────┐        │
│  │              AI Assistant (Claude)               │        │
│  │  "Buatkan issue", "Query database", "Ingat X"   │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**MCP Config:**
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "YOUR_TOKEN"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

### Setup B: All-in-One Git (GitHub Focused)

Untuk yang mau semua di satu tempat:

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Repo                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Issues    │  │  Projects   │  │   Actions   │          │
│  │   (Tasks)   │  │   (Board)   │  │   (CI/CD)   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│  ┌─────────────────────────────────────────────────┐        │
│  │        Playwright MCP (Browser Control)          │        │
│  │   AI can click, type, read GitHub via browser    │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Setup C: Local-First (Markdown + Git)

Untuk offline-first / privacy-conscious:

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Git Repo                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  TODO.md    │  │  ROADMAP.md │  │  docs/*.md  │          │
│  │  (Tasks)    │  │ (Milestones)│  │   (Specs)   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│  ┌─────────────────────────────────────────────────┐        │
│  │           Filesystem MCP (read/write files)      │        │
│  │     AI directly edits markdown task files        │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Kesimpulan

### TL;DR Rekomendasi

| Situasi | Rekomendasi |
|---------|-------------|
| **Sudah pakai Linear** | ✅ Tetap Linear + MCP |
| **Mau yang paling simpel** | GitHub Issues (sudah ada) |
| **Butuh docs + PM** | Notion + Supabase MCP |
| **Offline-first** | Markdown files in repo |
| **Mau explore** | Coba Playwright MCP untuk control any web app |

### Saran Saya untuk Kamu

Karena kamu sudah setup Linear MCP dan berjalan dengan baik, **tetap pakai Linear**. Alasannya:
1. MCP sudah berjalan dan teruji
2. Struktur project sudah dibuat (4 projects, 15 issues)
3. Integrasi AI sudah lancar
4. Tidak perlu migrasi = less friction

Yang bisa ditambah:
- **Memory MCP** untuk menyimpan context project jangka panjang
- **Supabase MCP** untuk langsung query database dari AI

---

*Dokumen ini dibuat: 2026-02-05*
