from ultralytics import YOLO

try:
    model = YOLO("../model/defect_model.pt")
    with open("model_classes.txt", "w") as f:
        f.write(str(model.names))
    print("Model Classes written to model_classes.txt")
except Exception as e:
    print(f"Error: {e}")
