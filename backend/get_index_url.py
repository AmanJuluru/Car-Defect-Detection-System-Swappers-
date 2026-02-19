import firebase_admin
from firebase_admin import credentials, firestore
from google.api_core import exceptions
import re

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

try:
    query = (
        db.collection("history")
        .where("company_id", "==", "CMRTC")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(1)
    )
    list(query.stream())
    print("Query successful (Index exists).")
except exceptions.FailedPrecondition as e:
    print("Missing Index.")
    url_match = re.search(r'https://console\.firebase\.google\.com[^\s]+', e.message)
    if url_match:
        url = url_match.group(0)
        print(f"URL: {url}")
        with open("url.txt", "w", encoding="utf-8") as f:
            f.write(url)
except Exception as e:
    print(f"Error: {e}")
