from utils.file_finder import find_file
from config.settings import BASE_DIR, ENGINE_FILE_NAME

if __name__ == "__main__":
    path = find_file(BASE_DIR, ENGINE_FILE_NAME)
    print("✅ ENGINE DITEMUKAN:")
    print(path)
