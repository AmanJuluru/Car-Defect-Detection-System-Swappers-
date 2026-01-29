import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

load_dotenv()

# Check for service account path in env or default location
SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")

# Default to serviceAccountKey.json in backend directory if env var not set
if not SERVICE_ACCOUNT_PATH:
    default_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    if os.path.exists(default_path):
        SERVICE_ACCOUNT_PATH = default_path

def initialize_firebase():
    try:
        if not firebase_admin._apps:
            if SERVICE_ACCOUNT_PATH and os.path.exists(SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': 'car-defect-total.appspot.com'
                })
                print("Firebase Admin initialized successfully.")
                return True
            else:
                print(f"Warning: Firebase Service Account Key not found at {SERVICE_ACCOUNT_PATH}. Auth features may fail.")
                return False
        else:
            print("Firebase Admin already initialized.")
            return True
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        import traceback
        traceback.print_exc()
        return False

firebase_initialized = initialize_firebase()

# Only initialize Firestore client if Firebase is properly initialized
if firebase_initialized:
    try:
        db = firestore.client()
        print("Firestore client initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firestore client: {e}")
        import traceback
        traceback.print_exc()
        db = None
else:
    print("Firestore client not initialized - Firebase Admin setup failed.")
    db = None

try:
    from firebase_admin import storage
    print("Firebase Storage module imported.")
except ImportError:
    print("Warning: could not import storage")
    storage = None
