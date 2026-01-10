# Panduan Rebuild TensorRT Engine File

## Masalah Saat Ini

File `bestbaru.engine` dibuat dengan **TensorRT versi 239**, tapi sistem saat ini menggunakan **TensorRT versi 240 (10.10.0.31)**. Versi tidak kompatibel!

## Yang Dibutuhkan untuk Menggunakan bestbaru.engine

### 1. **TensorRT Version Match**
   - Engine file dibuat dengan TensorRT versi **239**
   - Sistem saat ini menggunakan TensorRT versi **240 (10.10.0.31)**
   - **Solusi**: Rebuild engine file dengan TensorRT versi yang sama dengan sistem

### 2. **File Model Sumber**
   - File `.pt` (PyTorch model) - **bestbaru.pt**
   - Atau file `.onnx` (ONNX model) - **bestbaru.onnx**
   - File ini diperlukan untuk rebuild engine

### 3. **Hardware Requirements**
   - ✅ GPU NVIDIA (RTX 3060 terdeteksi)
   - ✅ CUDA terinstall
   - ✅ TensorRT terinstall (versi 10.10.0.31)

## Solusi

### Opsi 1: Rebuild Engine File (Recommended)

1. **Pastikan ada file model sumber**:
   ```bash
   # Cek apakah ada bestbaru.pt atau bestbaru.onnx
   dir bestbaru.*
   ```

2. **Rebuild engine dengan TensorRT versi saat ini**:
   ```python
   from ultralytics import YOLO
   
   # Load model
   model = YOLO("bestbaru.pt")  # atau bestbaru.onnx
   
   # Export ke TensorRT engine
   model.export(format="engine", imgsz=640)  # Akan menghasilkan bestbaru.engine baru
   ```

3. **Atau gunakan command line**:
   ```bash
   yolo export model=bestbaru.pt format=engine imgsz=640
   ```

### Opsi 2: Gunakan Model Alternatif (Temporary)

Jika tidak ingin rebuild engine, gunakan model `.pt` atau `.onnx`:
- Sistem akan otomatis fallback ke `bestbaru.pt` jika engine gagal
- Atau ubah path model di Control Panel ke `bestbaru.pt`

### Opsi 3: Downgrade TensorRT (Tidak Disarankan)

Downgrade TensorRT ke versi 239 (tidak disarankan karena bisa merusak kompatibilitas dengan library lain).

## Cara Cek Versi TensorRT

```python
import tensorrt as trt
print(f"TensorRT Version: {trt.__version__}")
```

## Cara Rebuild Engine (Script)

Jalankan script `rebuild_engine.py` yang sudah disediakan:

```bash
python rebuild_engine.py
```

Script ini akan:
1. Cek apakah ada file model sumber (.pt atau .onnx)
2. Rebuild engine file dengan TensorRT versi yang benar
3. Backup engine file lama
4. Generate engine file baru

## Catatan Penting

- Engine file **TIDAK** bisa digunakan di GPU dengan arsitektur berbeda
- Engine file **TIDAK** bisa digunakan dengan TensorRT versi berbeda
- Selalu backup engine file lama sebelum rebuild
- Pastikan GPU yang digunakan untuk rebuild sama dengan GPU untuk inference

