import firebase_admin
from firebase_admin import credentials, firestore
from google.api_core import exceptions

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("Testing Firestore query for Admin Dashboard...")
try:
    # Mimic the query in main.py
    query = (
        db.collection("history")
        .where("company_id", "==", "CMRTC")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(1)
    )
    docs = list(query.stream())
    print("Query successful!")
    print(f"Found {len(docs)} documents.")
except exceptions.FailedPrecondition as e:
    print("\n!!! QUERY FAILED (Likely Missing Index) !!!")
    print(f"Error: {e.message}")
    
    import re
    url_match = re.search(r'https://console\.firebase\.google\.com[^\s]+', e.message)
    if url_match:
        print(f"\nCreate the index here:\n{url_match.group(0)}")
except Exception as e:
    print(f"An error occurred: {e}")
