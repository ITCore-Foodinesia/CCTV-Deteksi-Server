// ============================================================================
// Catatan Deployment: Sisi Server (PC Client tempat CCTV Server berjalan)
// Opsi B — Per-Camera Auth Token via Edge Function Proxy
// Compile: typst compile 2026-02-16--server-side-deployment-notes.typ
// ============================================================================

#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm),
  fill: white,
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 8pt, fill: gray)
      #grid(
        columns: (1fr, 1fr),
        align(left)[Catatan Deployment — Server Side],
        align(right)[Halaman #counter(page).display()],
      )
      #line(length: 100%, stroke: 0.5pt + luma(200))
    ]
  },
)
#set text(font: "Segoe UI", size: 10pt)
#set heading(numbering: none)
#set par(justify: true, leading: 0.7em)

// ── Color Palette ──
#let blue    = rgb("#1565c0")
#let sky     = rgb("#e3f2fd")
#let green   = rgb("#2e7d32")
#let mint    = rgb("#e8f5e9")
#let orange  = rgb("#ef6c00")
#let peach   = rgb("#fff3e0")
#let red     = rgb("#c62828")
#let rose    = rgb("#fce4ec")
#let purple  = rgb("#6a1b9a")
#let lilac   = rgb("#f3e5f5")
#let gray    = rgb("#616161")
#let lgray   = rgb("#f5f5f5")
#let teal    = rgb("#00695c")
#let tealbg  = rgb("#e0f2f1")
#let navy    = rgb("#1a237e")
#let amber   = rgb("#f9a825")

// ── Reusable Components ──

#let badge(label, bg, fg: white) = {
  box(
    fill: bg,
    radius: 4pt,
    inset: (x: 8pt, y: 3pt),
    text(fill: fg, weight: "bold", size: 8pt, label),
  )
}

#let infobox(title, body, accent: blue, bg: sky) = {
  block(
    width: 100%,
    fill: bg,
    radius: 8pt,
    stroke: 0.5pt + accent,
    inset: 12pt,
    above: 10pt,
    below: 10pt,
  )[
    #text(fill: accent, weight: "bold", size: 10pt)[#title] \
    #text(size: 9pt)[#body]
  ]
}

#let warnbox(title, body) = infobox(title, body, accent: orange, bg: peach)
#let successbox(title, body) = infobox(title, body, accent: green, bg: mint)
#let dangerbox(title, body) = infobox(title, body, accent: red, bg: rose)

#let stepbox(num, title, body) = {
  block(
    width: 100%,
    fill: lgray,
    radius: 8pt,
    inset: 12pt,
    above: 10pt,
    below: 10pt,
  )[
    #grid(
      columns: (auto, 1fr),
      gutter: 12pt,
      box(
        fill: blue,
        radius: 20pt,
        inset: (x: 10pt, y: 6pt),
        text(fill: white, weight: "bold", size: 12pt)[#num],
      ),
      [
        #text(fill: navy, weight: "bold", size: 11pt)[#title] \
        #text(size: 9pt)[#body]
      ],
    )
  ]
}

// ============================================================================
// COVER
// ============================================================================

#align(center)[
  #v(2cm)
  #text(size: 24pt, weight: "black", fill: navy)[
    Catatan Deployment \
    Sisi Server / PC Client
  ]
  #v(0.5cm)
  #line(length: 60%, stroke: 2pt + blue)
  #v(0.5cm)
  #text(size: 12pt, fill: gray)[
    Yang perlu dilakukan di PC tempat CCTV Server (Flask) berjalan \
    + Cloudflare Tunnel terhubung
  ]
  #v(1cm)
  #text(size: 10pt, fill: gray)[Tanggal: 16 Februari 2026 · Versi: 1.0]
]

#pagebreak()

// ============================================================================
// OVERVIEW
// ============================================================================

= Gambaran Umum Arsitektur

#block(fill: lgray, radius: 8pt, inset: 12pt, width: 100%)[
  #text(font: "Consolas", size: 8pt)[
    ┌────────────────┐                     ┌──────────────┐ \
    │ PC Client      │   Cloudflare Tunnel  │  Internet    │ \
    │ (Server CCTV)  │ ◄──────────────────► │              │ \
    │                │                      │              │ \
    │  Flask :5001   │                      │  Supabase    │ \
    │  YOLO AI       │                      │  Edge Fn     │ \
    │  .env          │                      │  (proxy)     │ \
    │  CCTV Camera   │                      │              │ \
    └────────────────┘                      │  Dashboard   │ \
                                            │  (Vercel)    │ \
                                            └──────────────┘ \
    \
    PC Client = komputer fisik yang terhubung ke kamera CCTV \
    via USB/IP camera dan menjalankan Python Flask server.
  ]
]

#infobox("Yang Berubah dengan Opsi B")[
  Dari sisi PC Client / CCTV Server: *TIDAK ADA yang perlu diubah di sisi server Python*.

  Sistem Opsi B bekerja sepenuhnya di layer cloud (Supabase + Vercel).
  CCTV server Flask tetap menerima request seperti biasa — baik via query param `?auth=` maupun header `x-api-key`.

  Yang berubah hanya *siapa yang mengirim request ke server*: dulu browser langsung, sekarang Edge Function yang menjadi "perantara".
]

#pagebreak()

// ============================================================================
// SKENARIO
// ============================================================================

= Skenario Deployment

Ada dua skenario tergantung apakah kamu sudah mengaktifkan `SERVER_AUTH_KEY` di CCTV server atau belum.

== Skenario A: Server Sudah Pakai Auth Key (Recommended)

Artinya file `.env` di PC Client CCTV server sudah memiliki `SERVER_AUTH_KEY=some_password`.

#stepbox("1", "Pastikan server Python berjalan + auth key aktif")[
  Buka file `.env` di folder CCTV server Python (bukan folder dashboard):

  ```
  # File .env di PC CCTV Server
  UNIFIED_PORT=5001
  UNIFIED_DEBUG=true
  SERVER_AUTH_KEY=rahasia_super_aman_123
  ```

  Jalankan server seperti biasa:
  ```
  python api_server.py
  ```

  Pastikan bisa diakses: `http://localhost:5001/api/health`
]

#stepbox("2", "Pastikan Cloudflare Tunnel aktif")[
  Tunnel harus meneruskan traffic ke `localhost:5001`:
  ```
  cloudflared tunnel --url http://localhost:5001
  ```

  Atau jika pakai named tunnel:
  ```
  cloudflared tunnel run api-tunnel
  ```

  URL publik: `https://api.foodiserver.my.id`
]

#stepbox("3", "Daftarkan kamera di Dashboard")[
  Buka dashboard web → halaman *Cameras* → klik *Add Camera*:

  - *Name:* Dock A Camera (atau nama apapun)
  - *Location:* Gudang Utama
  - *Stream URL:* `https://api.foodiserver.my.id`
  - *Auth Token:* `rahasia_super_aman_123` (password yang sama dengan di server `.env`)
  - Klik *Save*

  Token akan dienkripsi AES-256 dan disimpan di database. Kamu tidak akan pernah bisa melihat token ini lagi dari browser.
]

#stepbox("4", "Verifikasi streaming")[
  - Buka halaman *Live Streaming*
  - Pilih kamera dari dropdown
  - Stream harus muncul via proxy Edge Function
  - Buka DevTools browser → Network tab → lihat request ke `/functions/v1/camera-stream-proxy`
  - Token CCTV server *tidak* terlihat di URL browser
]

#successbox("Selesai!")[
  Dengan skenario ini, auth token CCTV server tersimpan aman di database (terenkripsi) dan didekripsi oleh Edge Function saat streaming. Browser hanya mengirim Supabase JWT.
]

#pagebreak()

== Skenario B: Server Masih Open (Tanpa Auth Key)

Artinya file `.env` di PC Client CCTV server TIDAK punya `SERVER_AUTH_KEY` (atau kosong).

#stepbox("1", "Server Python berjalan tanpa auth")[
  File `.env` di PC CCTV Server:
  ```
  UNIFIED_PORT=5001
  UNIFIED_DEBUG=true
  # SERVER_AUTH_KEY=  (kosong atau di-comment)
  ```

  Ini artinya siapapun yang tahu URL tunnel bisa akses stream. Ini kurang aman tapi lebih simpel.
]

#stepbox("2", "Daftarkan kamera TANPA auth token")[
  Di dashboard → *Cameras* → *Add Camera*:

  - *Stream URL:* `https://api.foodiserver.my.id`
  - *Auth Token:* (kosongkan)
  - Save

  Edge Function akan tetap bisa proxy stream, tapi tanpa mengirim auth ke server.
]

#warnbox("Risiko Keamanan")[
  Tanpa `SERVER_AUTH_KEY` di server Python, siapapun yang menemukan URL Cloudflare Tunnel
  bisa langsung mengakses CCTV stream tanpa autentikasi.

  *Rekomendasi kuat:* Selalu set `SERVER_AUTH_KEY` di server Python.
]

#pagebreak()

// ============================================================================
// CHECKLIST PC CLIENT
// ============================================================================

= Checklist untuk PC Client (Server CCTV)

#table(
  columns: (auto, 1fr, auto),
  inset: 8pt,
  fill: (_, y) => if y == 0 { sky } else { white },
  stroke: 0.5pt + luma(200),
  [*\#*], [*Item*], [*Status*],
  [1], [Python Flask server (`api_server.py`) berjalan di port 5001], [☐],
  [2], [`SERVER_AUTH_KEY` diisi di file `.env` server Python], [☐],
  [3], [Cloudflare Tunnel aktif dan meneruskan ke `localhost:5001`], [☐],
  [4], [URL publik bisa diakses: `https://api.foodiserver.my.id/api/health`], [☐],
  [5], [Kamera terdaftar di dashboard dengan Stream URL + Auth Token], [☐],
  [6], [Test streaming dari halaman Live Streaming — stream muncul], [☐],
  [7], [Test tanpa auth — buka stream URL langsung di browser harus 401], [☐],
)

// ============================================================================
// YANG TIDAK PERLU DIUBAH
// ============================================================================

= Yang TIDAK Perlu Diubah di Server Python

#successbox("Zero Changes Required")[
  Server Python Flask kamu *tidak perlu dimodifikasi sama sekali* untuk Opsi B.
  Middleware auth yang sudah kamu implementasikan sebelumnya tetap bekerja:

  - Server tetap menerima `?auth=` query param (digunakan oleh Edge Function saat proxy)
  - Server tetap menerima `x-api-key` header (juga dikirim oleh Edge Function)
  - Endpoint `/api/health` tetap terbuka untuk monitoring
  - Semua endpoint lain tetap dilindungi oleh `SERVER_AUTH_KEY`
]

Yang berubah hanya di sisi *cloud*:
- *Supabase:* Migration baru + Edge Function baru
- *Dashboard (Vercel):* Update komponen React
- *Browser:* Request tidak langsung ke CCTV server, tapi via proxy Edge Function

#pagebreak()

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

= Troubleshooting

== Stream tidak muncul di dashboard

#table(
  columns: (auto, 1fr, 1fr),
  inset: 8pt,
  fill: (_, y) => if y == 0 { rose } else { white },
  stroke: 0.5pt + luma(200),
  [*\#*], [*Gejala*], [*Solusi*],
  [1], [Error 401 dari Edge Function], [Pastikan sudah login di dashboard. JWT mungkin expired — refresh halaman.],
  [2], [Error 403 "not a member"], [User tidak terdaftar sebagai anggota tenant kamera. Tambahkan di halaman Users.],
  [3], [Error 422 "stream_url not configured"], [Kamera belum diisi Stream URL. Edit kamera di halaman Cameras.],
  [4], [Error 500 "encryption key not configured"], [Belum set `app.encryption_key` di Supabase. Jalankan: \
    `ALTER DATABASE postgres SET app.encryption_key = 'your-key';`],
  [5], [Error 502 "Upstream server returned ..."], [CCTV server Python mati atau Cloudflare Tunnel terputus. Cek di PC Client.],
  [6], [Stream muncul tapi lambat / patah-patah], [Edge Function ada latency tambahan. Pertimbangkan region Supabase yang lebih dekat.],
  [7], [Auth token salah (stream muncul 401 dari upstream)], [Token di dashboard tidak cocok dengan `SERVER_AUTH_KEY` di `.env` server. Edit kamera → isi ulang token.],
)

== Memeriksa apakah server Python menerima request dari Edge Function

Di PC Client, jalankan server dengan `UNIFIED_DEBUG=true`:
```
UNIFIED_DEBUG=true python api_server.py
```

Buka dashboard → Live Streaming → pilih kamera. Di terminal server Python seharusnya muncul log request dari IP Supabase Edge Function (bukan IP browser user):

```
[2026-02-16 23:15:32] INFO - GET /api/stream/video?auth=***&t=1234567890
[2026-02-16 23:15:32] INFO - Request from: 34.xx.xx.xx (Supabase Edge)
```

#pagebreak()

// ============================================================================
// FAQ
// ============================================================================

= FAQ (Pertanyaan Umum)

== Q: Apakah saya harus mengubah kode Python di server CCTV?

*Tidak.* Opsi B sepenuhnya bekerja di layer cloud. Server Python kamu tetap sama persis.

== Q: Apakah Cloudflare Tunnel harus tetap jalan?

*Ya.* Cloudflare Tunnel adalah "jembatan" yang menghubungkan server lokal kamu ke internet. Tanpa tunnel, Edge Function tidak bisa mencapai server CCTV kamu.

== Q: Bagaimana jika IP PC berubah?

Tidak masalah. Cloudflare Tunnel menggunakan outbound connection dari PC kamu ke Cloudflare, jadi tidak perlu static IP. Selama tunnel berjalan, URL `api.foodiserver.my.id` tetap bisa diakses.

== Q: Bisakah saya punya banyak kamera dari server berbeda?

*Ya!* Setiap kamera di database bisa punya `stream_url` yang berbeda. Misalnya:
- Kamera 1: `https://api.foodiserver.my.id` (gudang utama)
- Kamera 2: `https://api2.foodiserver.my.id` (gudang kedua)
- Kamera 3: `http://192.168.1.50:5001` (lokal — hanya bisa dari Edge Function jika Supabase bisa reach)

Setiap kamera juga bisa punya auth token yang berbeda.

== Q: Apakah `VITE_SERVER_AUTH_KEY` di dashboard `.env` masih diperlukan?

Untuk *Opsi B* (per-camera proxy): *Tidak wajib.* Token per-kamera disimpan di database.

Tapi `VITE_SERVER_AUTH_KEY` masih dipakai untuk *mode legacy* (global stream) yang tetap ada sebagai fallback. Jika kamu sudah semua kamera pakai Opsi B, bisa dikosongkan.

== Q: Bagaimana rollback jika ada masalah?

- Dashboard otomatis fallback ke legacy mode jika tidak ada kamera DB yang streamable
- Hapus token di database → Edge Function akan proxy tanpa auth
- Set `VITE_SERVER_AUTH_KEY` di dashboard `.env` untuk kembali ke mode global

#v(1cm)

#align(center)[
  #block(fill: mint, radius: 12pt, inset: 16pt, width: 80%)[
    #text(fill: green, weight: "bold", size: 12pt)[
      Intinya: Di PC Server CCTV tidak perlu ubah apapun. ✅
    ] \
    #text(size: 9pt)[
      Pastikan: (1) Server Python jalan, (2) AUTH_KEY aktif, (3) Tunnel aktif, (4) Daftarkan kamera di dashboard.
    ]
  ]
]
