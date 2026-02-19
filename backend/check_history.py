import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

history_ref = db.collection("history")
docs = history_ref.stream()

print("Checking history items for company_id...")
count = 0
missing_company = 0
for doc in docs:
    count += 1
    data = doc.to_dict()
    company_id = data.get("company_id")
    print(f"ID: {doc.id} | Company ID: {company_id} | User: {data.get('user_email')}")
    if not company_id:
        missing_company += 1

print(f"\nTotal items: {count}")
print(f"Items missing company_id: {missing_company}")
