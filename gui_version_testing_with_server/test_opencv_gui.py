import cv2
import numpy as np
import sys

print(f"Python version: {sys.version}")
print(f"OpenCV version: {cv2.__version__}")

try:
    window_name = "Reproduction Window"
    print(f"Attempting to create window: {window_name}")
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    img = np.zeros((200, 200, 3), np.uint8)
    cv2.putText(img, "TEST", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.imshow(window_name, img)
    print("Success: OpenCV GUI functions are working.")
    cv2.waitKey(1000)
    cv2.destroyAllWindows()
except Exception as e:
    print(f"FAILURE: OpenCV GUI error detected: {e}")
    import traceback
    traceback.print_exc()
