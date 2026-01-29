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
