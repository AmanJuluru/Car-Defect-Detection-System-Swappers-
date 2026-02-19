import firebase_admin
from firebase_admin import credentials, firestore
import os

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
history_ref = db.collection("history")
docs = history_ref.stream()

UPLOAD_DIR = "uploads"
missing_count = 0
total_count = 0

print(f"Checking for missing local images in '{UPLOAD_DIR}'...")

for doc in docs:
    total_count += 1
    data = doc.to_dict()
    image_url = data.get("image_url")
    
    if image_url and "localhost" in image_url:
        filename = image_url.split("/")[-1]
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            print(f"[MISSING] Doc ID: {doc.id} | URL: {image_url}")
            missing_count += 1
        else:
            # print(f"[OK] {filename}")
            pass

print(f"\nTotal items: {total_count}")
print(f"Missing local files: {missing_count}")
