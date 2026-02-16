import cv2
import numpy as np
from detect import is_vehicle

def test_vehicle_detection():
    print("Testing vehicle detection logic...")

    # 1. Test existing image (should be a bus)
    try:
        with open("bus.jpg", "rb") as f:
            car_bytes = f.read()
        
        if is_vehicle(car_bytes):
            print("PASS: bus.jpg detected as vehicle.")
        else:
            print("FAIL: bus.jpg NOT detected as vehicle (Is it a car?)")
    except FileNotFoundError:
        print("SKIP: bus.jpg not found.")

    # 2. Test dummy image (black square, should NOT be a car)
    # Create black image 640x640
    dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
    _, dummy_bytes = cv2.imencode(".jpg", dummy_img)
    dummy_bytes = dummy_bytes.tobytes()

    if not is_vehicle(dummy_bytes):
        print("PASS: Dummy black image correctly rejected.")
    else:
        print("FAIL: Dummy black image detected as vehicle!")

if __name__ == "__main__":
    test_vehicle_detection()
