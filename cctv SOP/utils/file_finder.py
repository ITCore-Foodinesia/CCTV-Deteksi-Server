import os

def find_file(root_dir: str, filename: str) -> str:
    """
    Mencari file secara rekursif dari root_dir.
    Akan mengembalikan full path jika ditemukan.
    """
    for root, _, files in os.walk(root_dir):
        if filename in files:
            return os.path.join(root, filename)

    raise FileNotFoundError(
        f"❌ File '{filename}' tidak ditemukan di dalam folder: {root_dir}"
    )
