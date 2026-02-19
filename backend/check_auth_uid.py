import firebase_admin
from firebase_admin import credentials, auth

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

email = "247r1a05dn@cmrtc.ac.in"
try:
    user = auth.get_user_by_email(email)
    print(f"Email: {user.email}")
    print(f"Auth UID: {user.uid}")
except Exception as e:
    print(f"Error: {e}")
