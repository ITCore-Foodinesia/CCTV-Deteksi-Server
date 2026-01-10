import os
import json
import threading
import time

# Global flag to check if firebase is initialized
_firebase_initialized = False

def initialize_firebase(cred_path):
    """
    Inisialisasi koneksi ke Firebase.
    Membutuhkan file serviceAccountKey.json dari Firebase Console.
    """
    global _firebase_initialized
    if _firebase_initialized:
        return True

    if not os.path.exists(cred_path):
        # Silent fail jika file tidak ada (fitur opsional)
        # print(f"ℹ️ Firebase credential file not found at: {cred_path}")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        _firebase_initialized = True
        print("✅ Firebase initialized successfully")
        return True
    except ImportError:
        print("⚠️ Library 'firebase-admin' not installed. Install with: pip install firebase-admin")
        return False
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        return False

def send_fcm_notification(token, title, body, data=None):
    """
    Mengirim notifikasi ke perangkat Android via FCM.
    """
    if not _firebase_initialized:
        return False

    try:
        from firebase_admin import messaging
        
        # Pastikan data dikonversi ke string semua (FCM requirement untuk data payload)
        clean_data = {}
        if data:
            for k, v in data.items():
                clean_data[str(k)] = str(v)

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=clean_data,
            token=token,
        )
        
        response = messaging.send(message)
        print(f"✅ Notifikasi dikirim ke HP Driver (Token): {response}")
        return True
    except Exception as e:
        print(f"❌ Gagal kirim notifikasi ke HP: {e}")
        return False

def send_fcm_topic_notification(topic, title, body, data=None):
    """
    Mengirim notifikasi ke Topic (untuk QR Static).
    Aplikasi Android harus subscribe ke topic ini (misal: 'plate_KT1234AB').
    """
    if not _firebase_initialized:
        return False

    try:
        from firebase_admin import messaging
        
        # Bersihkan nama topic (hanya boleh alphanumeric, -, _)
        clean_topic = "".join(c for c in topic if c.isalnum() or c in "-_")
        
        clean_data = {}
        if data:
            for k, v in data.items():
                clean_data[str(k)] = str(v)

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=clean_data,
            topic=clean_topic,
        )
        
        response = messaging.send(message)
        print(f"✅ Notifikasi dikirim ke Topic '{clean_topic}': {response}")
        return True
    except Exception as e:
        print(f"❌ Gagal kirim notifikasi ke Topic: {e}")
        return False

def send_scan_success_notification(token=None, topic=None, plate="UNKNOWN"):
    """
    Helper function fleksibel: Bisa kirim via Token ATAU Topic.
    """
    title = "Scan Berhasil! ✅"
    body = f"Plat {plate} terkonfirmasi. Silakan masuk."
    data = {
        "type": "scan_success",
        "plate": plate,
        "timestamp": str(int(time.time()))
    }

    if token:
        return send_fcm_notification(token, title, body, data)
    elif topic:
        return send_fcm_topic_notification(topic, title, body, data)
    return False
