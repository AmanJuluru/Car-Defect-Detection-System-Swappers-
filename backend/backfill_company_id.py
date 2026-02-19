import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
history_ref = db.collection("history")
docs = history_ref.stream()

COMPANY_ID = "CMRTC" # Target company ID to backfill

print(f"Backfilling company_id='{COMPANY_ID}' to history items...")
count = 0
for doc in docs:
    data = doc.to_dict()
    if not data.get("company_id"):
        print(f"Updating doc {doc.id}...")
        doc.reference.update({"company_id": COMPANY_ID})
        count += 1
    else:
        print(f"Skipping doc {doc.id} (already has company_id: {data.get('company_id')})")

print(f"\nBackfill complete. Updated {count} documents.")
