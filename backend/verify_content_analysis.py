from detect import analyze_image_content
import cv2
import numpy as np

def test_content_analysis():
    print("Testing content analysis logic...")

    # 1. Test Bus (Vehicle)
    try:
        with open("bus.jpg", "rb") as f:
            bus_bytes = f.read()
        
        analysis = analyze_image_content(bus_bytes)
        print(f"\nBus Analysis: {analysis}")
        
        if analysis["is_vehicle"]:
            print("PASS: Bus detected as vehicle.")
        else:
            print("FAIL: Bus NOT detected as vehicle.")
            
    except FileNotFoundError:
        print("SKIP: bus.jpg not found.")

    # 2. Test Zidane (Person - Forbidden)
    try:
        with open("zidane.jpg", "rb") as f:
            person_bytes = f.read()
            
        analysis = analyze_image_content(person_bytes)
        print(f"\nPerson Analysis: {analysis}")
        
        if not analysis["is_vehicle"] and analysis["has_forbidden"]:
            print(f"PASS: Person detected as forbidden: {analysis['forbidden_label']}")
        else:
            print("FAIL: Person NOT detected as forbidden correctly.")
            
    except FileNotFoundError:
        print("SKIP: zidane.jpg not found.")

if __name__ == "__main__":
    test_content_analysis()
