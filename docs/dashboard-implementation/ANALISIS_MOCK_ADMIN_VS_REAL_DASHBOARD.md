# Analisis Mock Admin vs Real Dashboard & Rekomendasi Implementasi

## 1. Pendahuluan

Dokumen ini menganalisis fitur dan pola implementasi yang ditemukan pada `hello_flutter/mock-admin` dan membandingkannya dengan `dashboard` (React) saat ini. Tujuannya adalah untuk memandu pengembangan dashboard utama agar selaras dengan kebutuhan operasional yang telah divalidasi melalui mock admin tersebut.

## 2. Ringkasan Mock Admin (`hello_flutter/mock-admin`)

Mock Admin adalah prototipe berbasis HTML/JS murni yang berfungsi sebagai kontrol panel untuk aplikasi mobile driver. Fitur kuncinya adalah:
*   **Realtime-First**: Hampir semua data (statistik, tabel, log) diperbarui secara instan via Supabase Realtime.
*   **Manajemen Operasional Lengkap**: CRUD untuk Drivers, Trucks, Docks, Helpers, dan Loaders.
*   **Visualisasi Dock**: Grid interaktif untuk melihat dan mengubah status dock (Available/Maintenance) dengan cepat.
*   **Session Monitoring**: Pemantauan langsung proses loading yang sedang berjalan.

## 3. Gap Analysis: Mock vs Real Dashboard

| Fitur / Komponen | Mock Admin (Target Behavior) | Real Dashboard (React) Current State | Action Item / Rekomendasi |
| :--- | :--- | :--- | :--- |
| **Tech Stack** | HTML + JS + Tailwind (CDN) | React + Vite + Tailwind + Supabase | **Pertahankan React.** Migrasikan logika bisnis dari script mock ke React Hooks/Components. |
| **Realtime Updates** | Langsung subscribe ke semua tabel utama (`loading_sessions`, `docks`, dll). | Menggunakan WebSocket untuk CCTV, perlu integrasi Supabase Realtime lebih dalam. | **Implementasi `useSupabaseRealtime` hook** di React untuk subscribe ke tabel-tabel operasional. |
| **Dock Management** | Grid Visual Interaktif (Klik to Toggle Status). | Halaman Docks mungkin masih berupa tabel atau belum seinteraktif mock. | **Buat `DockGridComponent`** di React yang meniru visualisasi status warna-warni dan interaksi klik cepat mock admin. |
| **Personel Management** | Terpisah: Drivers, Helpers, Loaders. | Driver management ada. Helper/Loader perlu dicek. | Pastikan ada menu/halaman terdedikasi untuk **Helpers** dan **Loaders** dengan fitur CRUD lengkap. |
| **Activity Log** | Log aktivitas realtime di dashboard utama. | Ada Activity Log komponen. | Pastikan log ini bersumber dari tabel `loading_events` di Supabase secara realtime. |
| **Quick Actions** | Tombol cepat untuk Add Driver, Refresh, View Docks. | Tersebar di navigasi/halaman masing-masing. | Pertimbangkan **Quick Action Widget** di halaman Overview dashboard React. |

## 4. Rekomendasi Implementasi di Dashboard React

### 4.1. Struktur Navigasi & Halaman
Pastikan Dashboard React memiliki rute berikut untuk mencakup fitur mock:
*   `/overview`: Stats realtime + Activity Log + Quick Actions.
*   `/sessions`: Active Sessions (Live Monitor) + History.
*   `/docks`: Visual Grid Dock Management.
*   `/resources/drivers`: Tabel Driver.
*   `/resources/trucks`: Tabel Truk.
*   `/resources/helpers`: Tabel Helper (Baru).
*   `/resources/loaders`: Tabel Loader (Baru).

### 4.2. Supabase Realtime Hook Pattern
Gunakan pola ini di React untuk menyamai responsivitas mock admin:

```javascript
// Contoh pseudocode hook
const useRealtimeTable = (tableName, initialData = []) => {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    // 1. Fetch initial
    fetchData();

    // 2. Subscribe
    const subscription = supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
        handleRealtimeUpdate(payload, setData);
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [tableName]);

  return data;
};
```

### 4.3. UI Components to Port
Komponen UI dari mock yang perlu dibuat versi React-nya:
1.  **Status Badges**: Komponen visual status yang konsisten (misal: Hijau untuk Available, Merah untuk Maintenance).
2.  **Interactive Dock Card**: Card kecil merepresentasikan satu dock, menampilkan kode dock dan status warna, bisa diklik untuk aksi.
3.  **Realtime Counter Card**: Card statistik yang angkanya beranimasi atau update otomatis saat data berubah.

## 5. Kesimpulan
Dashboard website (React) harus berevolusi menjadi "Mission Control" yang hidup, bukan sekadar alat pelaporan statis. Penerapan prinsip **Realtime-First** dan **Interaktivitas Langsung** dari Mock Admin adalah kunci sukses integrasi dengan Mobile App dan sistem CCTV.
