import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

email = "247r1a05dn@cmrtc.ac.in"
users_ref = db.collection("users")
query = users_ref.where("email", "==", email)
docs = query.stream()

found = False
for doc in docs:
    found = True
    print(f"Email: {doc.to_dict().get('email')}")
    print(f"Firestore Doc ID: {doc.id}")
    print(f"Role: {doc.to_dict().get('role')}")

if not found:
    print("User not found in Firestore.")
