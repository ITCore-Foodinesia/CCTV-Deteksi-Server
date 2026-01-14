import cv2
from collections import defaultdict

from core.camera import Camera
from core.detector import SOPDetector
from config.settings import MIN_BOX_AREA

# =====================
# CONFIG
# =====================
CAMERA_INDEX = 0          # DroidCam kamu
FONT = cv2.FONT_HERSHEY_SIMPLEX
STABLE_FRAMES = 5         # ID harus muncul minimal 5 frame berturut

def main():
    print("🚀 CCTV SOP - YOLO TRACKING MODE")

    cam = Camera(CAMERA_INDEX)
    detector = SOPDetector()

    # counter per ID
    id_counter = defaultdict(int)

    while True:
        frame = cam.read()
        if frame is None:
            break

        results = detector.track(frame)

        # ID yang terdeteksi frame ini
        active_ids = set()

        for r in results:
            if r.boxes is None or r.boxes.id is None:
                continue

            for box, track_id in zip(r.boxes, r.boxes.id):
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # filter box terlalu kecil
                box_area = (x2 - x1) * (y2 - y1)
                if box_area < MIN_BOX_AREA:
                    continue

                cls_id = int(box.cls)
                label = r.names[cls_id]
                tid = int(track_id)

                active_ids.add(tid)
                id_counter[tid] += 1

                # hanya gambar jika sudah stabil
                if id_counter[tid] >= STABLE_FRAMES:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(
                        frame,
                        f"{label} | ID:{tid}",
                        (x1, max(y1 - 10, 20)),
                        FONT,
                        0.6,
                        (0, 255, 0),
                        2
                    )

        # reset counter untuk ID yang hilang
        for tid in list(id_counter.keys()):
            if tid not in active_ids:
                del id_counter[tid]

        # =====================
        # INFO DEBUG: hanya ID aktif & stabil
        # =====================
        y = 25
        stable_ids = {tid: cnt for tid, cnt in id_counter.items() if cnt >= STABLE_FRAMES}
        for tid, cnt in stable_ids.items():
            cv2.putText(
                frame,
                f"ID {tid}: {cnt} frames",
                (10, y),
                FONT,
                0.55,
                (0, 255, 255),
                2
            )
            y += 22

        cv2.imshow("CCTV SOP - TRACKING", frame)

        if cv2.waitKey(1) & 0xFF == 27:  # ESC
            break

    cam.release()
    cv2.destroyAllWindows()
    print("🛑 Program berhenti")

if __name__ == "__main__":
    main()

