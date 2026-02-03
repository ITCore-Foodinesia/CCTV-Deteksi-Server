#set page(paper: "a4", margin: 2cm)
#set text(font: "New Computer Modern", size: 11pt)
#set heading(numbering: "1.")

#align(center)[
  #text(size: 18pt, weight: "bold")[Report: 6 Must-Have MCP Servers untuk Web Developer 2025]
  
  #v(0.5em)
  #text(size: 10pt, fill: gray)[Sumber: DeployHQ Blog | Diambil: 31 Januari 2026]
]

#v(1em)

= Ringkasan Eksekutif

Artikel dari DeployHQ membahas *Model Context Protocol (MCP)* - standar terbuka dari Anthropic yang memungkinkan AI assistant (seperti Claude) terhubung dengan tools eksternal, data sources, dan services melalui interface terstandar.

*Insight Utama:*
- AI coding assistant hanya sekuat tools yang diberikan kepadanya
- MCP = "universal language" untuk AI melakukan aksi nyata
- Ribuan MCP server sudah tersedia, artikel ini memilih 6 yang paling esensial

= 6 MCP Server Wajib

== 1. GitHub MCP Server
*Fungsi:* Manajemen repository langsung dari AI assistant

*Use Case:*
- Baca issues, review PR, cek commit history
- Manage branches, buat file baru
- Semua via natural language

== 2. Context7
*Fungsi:* Dokumentasi up-to-date untuk AI coding

*Use Case:*
- Inject dokumentasi versi-spesifik ke prompt context
- Mengatasi masalah "hallucination" - AI pakai info dari training data yang outdated
- Support ribuan library

== 3. Filesystem MCP Server
*Fungsi:* Akses file lokal yang terkontrol

*Use Case:*
- Read, create, edit, organize files
- Search through logs
- Refactor code across multiple files

== 4. Puppeteer MCP Server
*Fungsi:* Browser automation dan testing

*Use Case:*
- Scraping documentation
- Testing deployed applications
- Visual regression screenshots
- Automasi web-based workflows

== 5. PostgreSQL/Database MCP Server
*Fungsi:* Akses database langsung

*Use Case:*
- Explore schema
- Write dan execute SQL queries via natural language
- Debugging dan data exploration

== 6. Sequential Thinking
*Fungsi:* Problem solving step-by-step

*Use Case:*
- Debugging masalah kompleks
- Planning refactoring projects
- Deployment strategy reasoning

= Best Practices Keamanan

#table(
  columns: (1fr, 2fr),
  stroke: 0.5pt,
  [*Aspek*], [*Rekomendasi*],
  [File Access], [Limit ke direktori yang diperlukan saja],
  [Database], [Gunakan read-only connection bila memungkinkan],
  [API Tokens], [Rotasi rutin, jangan commit ke version control],
  [Server Source], [Stick ke official/well-maintained servers],
  [Network], [Pahami external connections yang dibuat server],
)

= Coming Soon: DeployHQ MCP Server

DeployHQ mengumumkan akan membangun MCP server sendiri untuk *AI-powered deployment automation*:
- Deploy branches ke staging/production via chat
- Lihat deployment history
- Rollback deployments
- Check deployment status

= Referensi

- Model Context Protocol Documentation: https://modelcontextprotocol.io/
- Official MCP Servers Repository: https://github.com/modelcontextprotocol/servers
- Claude Desktop: https://claude.ai/download
- Claude Code Documentation: https://docs.anthropic.com/en/docs/claude-code
