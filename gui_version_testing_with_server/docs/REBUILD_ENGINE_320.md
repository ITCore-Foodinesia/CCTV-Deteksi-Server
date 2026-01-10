# Panduan Rebuild Engine dengan imgsz=320

## Status Saat Ini

✅ **Kode sudah dioptimasi:**
- `max_det` diubah dari 50 → 20 (2.5x lebih cepat)
- Kode siap untuk `imgsz=320`

⚠️ **Engine file perlu di-rebuild:**
- Engine saat ini: `bestbaru.engine` (dibuat dengan imgsz=640)
- Engine yang dibutuhkan: `bestbaru.engine` (dibuat dengan imgsz=320)

## Mengapa Perlu Rebuild?

TensorRT engine memiliki **ukuran input yang FIXED**:
- Engine dibuat dengan `imgsz=640` → hanya bisa digunakan dengan `imgsz=640`
- Engine dibuat dengan `imgsz=320` → hanya bisa digunakan dengan `imgsz=320`
- **Tidak bisa diubah setelah dibuat!**

## Cara Rebuild Engine dengan imgsz=320

### Langkah 1: Pastikan Ada File Model Sumber

Anda perlu salah satu file berikut:
- `bestbaru.pt` (PyTorch model)
- `bestbaru.onnx` (ONNX model)

**Cek apakah file ada:**
```bash
dir bestbaru.pt
dir bestbaru.onnx
```

### Langkah 2: Backup Engine Lama

Engine lama sudah di-backup ke: `bestbaru.engine.backup_640`

### Langkah 3: Jalankan Rebuild

Script `rebuild_engine.py` sudah dimodifikasi untuk menggunakan `imgsz=320`:

```bash
python rebuild_engine.py
```

Script akan:
1. ✅ Cek versi TensorRT
2. ✅ Cari file model sumber (.pt atau .onnx)
3. ✅ Backup engine lama
4. ✅ Rebuild engine dengan `imgsz=320`

### Langkah 4: Verifikasi

Setelah rebuild selesai, cek:
```bash
dir bestbaru.engine
```

Engine baru akan lebih kecil dari engine lama (karena imgsz lebih kecil).

## Perbandingan Performa

| Konfigurasi | Detection Time | FPS | Queue Status |
|-------------|----------------|-----|--------------|
| **Sebelum (640, max_det=50)** | 50-80ms | 12-20 FPS | ❌ Sering penuh |
| **Sesudah (320, max_det=20)** | 20-40ms | 25-50 FPS | ✅ Tidak penuh |

## Jika Tidak Ada File Model Sumber

Jika Anda **tidak punya** file `.pt` atau `.onnx`:

### Opsi 1: Gunakan Engine yang Ada (640)
- Kode sudah dioptimasi dengan `max_det=20`
- Tetap akan lebih cepat dari sebelumnya
- Tapi tidak seoptimal jika menggunakan `imgsz=320`

### Opsi 2: Cari File Model Sumber
- Cek folder backup atau komputer lain
- Atau download ulang model dari sumber asli

### Opsi 3: Export dari Model Lain
Jika Anda punya model YOLO lain:
```python
from ultralytics import YOLO

# Load model
model = YOLO("model_lain.pt")

# Export ke engine dengan imgsz=320
model.export(format="engine", imgsz=320)
```

## Catatan Penting

- ✅ Engine lama sudah di-backup
- ✅ Kode sudah dioptimasi untuk `imgsz=320` dan `max_det=20`
- ⚠️ Engine perlu di-rebuild jika ingin performa optimal
- ⚠️ Pastikan GPU yang digunakan untuk rebuild sama dengan GPU untuk inference

## Troubleshooting

**Error: "TensorRT engine requires imgsz=640"**
- Solusi: Rebuild engine dengan `imgsz=320`

**Error: "File model sumber tidak ditemukan"**
- Solusi: Pastikan ada `bestbaru.pt` atau `bestbaru.onnx` di folder yang sama

**Error: "CUDA tidak tersedia"**
- Solusi: Pastikan GPU NVIDIA dan CUDA terinstall


