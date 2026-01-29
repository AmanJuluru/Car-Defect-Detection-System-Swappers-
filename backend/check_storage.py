
import firebase_admin
from firebase_admin import credentials, storage
from google.cloud import storage as gcs
import os
import sys

# Path to service account key
SERVICE_ACCOUNT_PATH = 'serviceAccountKey.json'

with open("storage_check_result.txt", "w") as f:
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        f.write(f"Error: {SERVICE_ACCOUNT_PATH} not found.\n")
        exit(1)

    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    
    try:
        if len(firebase_admin._apps) == 0:
            app = firebase_admin.initialize_app(cred)
        
        # Use GCS client to list buckets
        client = gcs.Client.from_service_account_json(SERVICE_ACCOUNT_PATH)
        buckets = list(client.list_buckets())
        
        f.write(f"Found {len(buckets)} buckets:\n")
        for bucket in buckets:
            f.write(f"- {bucket.name}\n")
            
    except Exception as e:
        f.write(f"FAILED to list buckets: {e}\n")
