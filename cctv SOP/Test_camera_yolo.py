import cv2
from collections import defaultdict

from core.camera import Camera
from core.detector import SOPDetector
from config.settings import CONFIDENCE_THRESHOLD

# ==============================
# CONFIG
# ==============================
CAMERA_INDEX = 0
STABLE_FRAMES = 8
FONT = cv2.FONT_HERSHEY_SIMPLEX

def main():
    print("🚀 CCTV SOP - Camera YOLO Test (STABLE MODE)")

    cam = Camera(CAMERA_INDEX)
    detector = SOPDetector()

    # hitung stabil per label
    stable_counter = defaultdict(int)

    # simpan bbox terakhir per label
    last_bbox = {}

    while True:
        frame = cam.read()
        if frame is None:
            break

        results = detector.detect(frame)
        detected_this_frame = set()

        # ==============================
        # DETEKSI YOLO
        # ==============================
        for r in results:
            for box in r.boxes:
                conf = float(box.conf.item())
                if conf < CONFIDENCE_THRESHOLD:
                    continue

                cls_id = int(box.cls)
                label = r.names[cls_id]

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                detected_this_frame.add(label)

                # simpan bbox terakhir
                last_bbox[label] = {
                    "bbox": (x1, y1, x2, y2),
                    "conf": conf
                }

        # ==============================
        # UPDATE STABILISASI
        # ==============================
        for label in detected_this_frame:
            stable_counter[label] += 1

        for label in list(stable_counter.keys()):
            if label not in detected_this_frame:
                stable_counter[label] = max(0, stable_counter[label] - 1)

        # ==============================
        # GAMBAR BOX JIKA SUDAH STABIL
        # ==============================
        for label, count in stable_counter.items():
            if count >= STABLE_FRAMES and label in last_bbox:
                x1, y1, x2, y2 = last_bbox[label]["bbox"]
                conf = last_bbox[label]["conf"]

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame,
                    f"{label} {conf:.2f}",
                    (x1, max(y1 - 10, 20)),
                    FONT,
                    0.6,
                    (0, 255, 0),
                    2
                )

        # ==============================
        # DEBUG INFO
        # ==============================
        y = 25
        for label, count in stable_counter.items():
            cv2.putText(
                frame,
                f"{label}: {count}",
                (10, y),
                FONT,
                0.55,
                (0, 255, 255),
                2
            )
            y += 22

        cv2.imshow("CCTV SOP - TEST", frame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

    cam.release()
    cv2.destroyAllWindows()
    print("🛑 Program berhenti")

if __name__ == "__main__":
    main()
