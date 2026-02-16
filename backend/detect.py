from ultralytics import YOLO
from PIL import Image
import cv2
import numpy as np
import os

# Load model
MODEL_PATH = "../model/defect_model.pt"
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(f"Error loading model from {MODEL_PATH}: {e}")
    model = None

def predict_image(image_bytes):
    if model is None:
        return {"error": "Model not loaded"}
    
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Inference
    results = model(img)
    
    # Process results
    detections = []
    for result in results:
        for box in result.boxes:
            b = box.xyxy[0].tolist() # x1, y1, x2, y2
            conf = float(box.conf)
            cls = int(box.cls)
            class_name = model.names[cls]
            
            detections.append({
                "class": class_name,
                "confidence": round(conf, 2),
                "bbox": [round(x) for x in b]
            })
            
    return detections

# Load vehicle detection model (YOLOv8n is small and fast)
try:
    vehicle_model = YOLO("yolov8n.pt")
except Exception as e:
    print(f"Error loading vehicle model: {e}")
    vehicle_model = None

def analyze_image_content(image_bytes):
    """
    Analyze image content to check for vehicles and forbidden objects.
    Returns a dict with analysis results.
    """
    if vehicle_model is None:
        print("Vehicle model not loaded, skipping check.")
        return {"is_vehicle": True, "has_forbidden": False, "confidence": 0.0} 
    
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Perform inference
    results = vehicle_model(img)
    
    # Vehicle class IDs (COCO): car(2), motorcycle(3), bus(5), truck(7)
    vehicle_ids = [2, 3, 5, 7]
    
    # Forbidden class IDs (COCO) - People, Animals, Indoor/Household items
    # 0: person
    # 14-23: bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe
    # 24-28: backpack, umbrella, handbag, tie, suitcase
    # 56-62: chair, couch, potted plant, bed, dining table, toilet, tv
    forbidden_ids = [0] + list(range(14, 24)) + list(range(24, 29)) + list(range(56, 63))
    
    max_vehicle_conf = 0.0
    is_vehicle_detected = False
    
    forbidden_found = False
    forbidden_label = None
    max_forbidden_conf = 0.0
    
    for result in results:
        for box in result.boxes:
            cls = int(box.cls)
            conf = float(box.conf)
            
            if cls in vehicle_ids:
                if conf > max_vehicle_conf:
                    max_vehicle_conf = conf
                if conf > 0.4:
                    is_vehicle_detected = True
            
            elif cls in forbidden_ids:
                if conf > 0.5: # Higher threshold for rejecting
                    if conf > max_forbidden_conf:
                        max_forbidden_conf = conf
                        forbidden_found = True
                        forbidden_label = vehicle_model.names[cls]
                
    return {
        "is_vehicle": is_vehicle_detected,
        "vehicle_confidence": max_vehicle_conf,
        "has_forbidden": forbidden_found,
        "forbidden_label": forbidden_label,
        "forbidden_confidence": max_forbidden_conf
    }
