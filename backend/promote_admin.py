import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

def promote_user(email, company_id):
    # Find user by email
    users_ref = db.collection("users")
    query = users_ref.where("email", "==", email).limit(1)
    docs = query.stream()

    user_doc = None
    for doc in docs:
        user_doc = doc
        break

    if user_doc:
        print(f"Found user: {user_doc.id}")
        users_ref.document(user_doc.id).update({
            "role": "admin",
            "company_id": company_id
        })
        print(f"Successfully promoted {email} to Admin for company {company_id}")
    else:
        print(f"User with email {email} not found.")

if __name__ == "__main__":
    email = input("Enter user email to promote: ")
    company = input("Enter company ID to assign (e.g., Tesla): ")
    promote_user(email, company)
