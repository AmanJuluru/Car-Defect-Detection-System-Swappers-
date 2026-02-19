import firebase_admin
from firebase_admin import credentials, firestore, auth

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
email = "247r1a05dn@cmrtc.ac.in"

# 1. Get Auth UID
try:
    user = auth.get_user_by_email(email)
    auth_uid = user.uid
    print(f"Auth UID: {auth_uid}")
except Exception as e:
    print(f"Error getting auth user: {e}")
    exit(1)

# 2. Get Firestore Document by Email
users_ref = db.collection("users")
query = users_ref.where("email", "==", email)
docs = list(query.stream())

if not docs:
    print("No Firestore document found for this email.")
    # Create new one?
    print(f"Creating new document for {auth_uid}...")
    db.collection("users").document(auth_uid).set({
        "email": email,
        "role": "admin",
        "company_id": "CMRTC" # customizable
    })
    print("Created.")
    exit(0)

# 3. Check for Mismatch and Migrate
for doc in docs:
    if doc.id != auth_uid:
        print(f"Found mismatch! Doc ID: {doc.id} != Auth UID: {auth_uid}")
        data = doc.to_dict()
        
        # Create new doc
        print(f"Migrating data to new doc: {auth_uid}")
        db.collection("users").document(auth_uid).set(data)
        
        # Delete old doc
        print(f"Deleting old doc: {doc.id}")
        doc.reference.delete()
        
        # Ensure role is admin
        print("Ensuring role is admin...")
        db.collection("users").document(auth_uid).update({
            "role": "admin",
            "company_id": data.get("company_id") or "CMRTC"
        })
        
    else:
        print("Doc ID matches Auth UID. Updating role to admin...")
        doc.reference.update({
            "role": "admin",
            "company_id": doc.to_dict().get("company_id") or "CMRTC"
        })

print("Migration and update complete.")
