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
deleted_count = 0

print(f"Cleaning up missing local images in '{UPLOAD_DIR}'...")

for doc in docs:
    data = doc.to_dict()
    image_url = data.get("image_url")
    
    if image_url and "localhost" in image_url:
        filename = image_url.split("/")[-1]
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            try:
                print(f"[DELETING] Doc ID: {doc.id} | URL: {image_url}")
                db.collection("history").document(doc.id).delete()
                deleted_count += 1
            except Exception as e:
                print(f"[ERROR] Failed to delete {doc.id}: {e}")

print(f"\nTotal erased items: {deleted_count}")
