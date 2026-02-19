from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import File, UploadFile, HTTPException, Form, Header, Query
from detect import predict_image, analyze_image_content
import uvicorn
import json
from firebase_config import db, storage
from datetime import datetime
import uuid
import logging
from google.api_core import exceptions as google_exceptions
from firebase_admin import auth as admin_auth

def _require_user_from_bearer(authorization: str | None):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "Unauthorized",
                "message": "Missing login token. Please log in again.",
            },
        )
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "Unauthorized",
                "message": "Missing login token. Please log in again.",
            },
        )
    try:
        decoded = admin_auth.verify_id_token(token)
        uid = decoded.get("uid")
        email = decoded.get("email")
        if not uid:
            raise Exception("Token missing uid")
        return uid, email
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "Unauthorized",
                "message": "Invalid or expired login token. Please log in again.",
                "technical_error": str(e),
            },
        )

def _json_safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


from fastapi.staticfiles import StaticFiles
import os

# Create uploads directory
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app = FastAPI(title="Car Defect Detection API", version="1.0.0")

# Mount uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS Configuration
# For local development we allow all origins to avoid CORS/preflight "Failed to fetch"
# (especially when using Authorization headers).
# If you deploy this, tighten it to your real frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Car Defect Detection API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    
    # Analyze image content
    analysis = analyze_image_content(contents)
    
    # Run defect detection
    detections = predict_image(contents)
    
    has_defects = len(detections) > 0 and "error" not in detections

    # Validation Logic:
    # 1. If it's explicitly a vehicle, ALLOW.
    # 2. If it's NOT a vehicle, check for forbidden objects (e.g., person).
    #    - If forbidden object found -> REJECT (even if defects found, likely false positive).
    #    - If NO forbidden object -> Check for defects (Close-up assumption).
    #      - If defects found -> ALLOW.
    #      - If no defects -> REJECT.
    
    # Validation Logic for /predict:
    # Prioritize showing defects if they exist, even if validation fails.
    # This ensures live camera feed works even with people/backgrounds in frame.
    
    if not has_defects:
        if not analysis["is_vehicle"]:
            if analysis["has_forbidden"]:
                 raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid image. Detected {analysis['forbidden_label']}. Please upload a vehicle image."
                )
            
            raise HTTPException(
                status_code=400, 
                detail="No vehicle detected. Please upload an image of an automobile (car, truck, bus, motorcycle)."
            )
    
    if "error" in detections:
        raise HTTPException(status_code=500, detail=detections["error"])
        
    return {"detections": detections}

@app.post("/api/v1/save_scan")
async def save_scan(
    file: UploadFile = File(...), 
    detections: str = Form(""), # Explicitly mark as Form data
    user_email: str = Form(""),
    user_id: str = Form(""),
    status: str = Form("Pending"),
    authorization: str | None = Header(default=None),
):
    # Check if Firestore is initialized
    if db is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Firestore Not Initialized",
                "message": "Firestore client is not properly initialized. Please check your Firebase configuration and service account key.",
                "technical_error": "db is None - Firebase Admin may not have been initialized correctly"
            }
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content for validation
    contents = await file.read()
    
    # Analyze image content
    analysis = analyze_image_content(contents)
    
    # Check for defects in provided metadata
    has_defects = False
    if detections:
        try:
            det_list = json.loads(detections)
            if isinstance(det_list, list) and len(det_list) > 0:
                has_defects = True
        except:
            pass
            
    # Validation Logic (Same as /predict)
    # Validation Logic (Same as /predict)
    # Only enforce strict checks if NO defects were found
    if not has_defects:
        if not analysis["is_vehicle"]:
            if analysis["has_forbidden"]:
                 raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid image. Detected {analysis['forbidden_label']}. Please upload a vehicle image."
                )
            
            # If no forbidden object but also no vehicle and no defects -> Reject
            raise HTTPException(
                status_code=400, 
                detail="No vehicle detected. Please upload an image of an automobile."
            )

    # Reset file cursor for later saving
    await file.seek(0)

    authed_uid, authed_email = _require_user_from_bearer(authorization)
    final_user_id = authed_uid
    final_user_email = authed_email or (user_email.strip() if user_email else "") or "guest@example.com"

    # Fetch user profile to get company_id
    user_company_id = None
    try:
        user_doc = db.collection("users").document(final_user_id).get()
        if user_doc.exists:
            user_company_id = user_doc.to_dict().get("company_id")
    except Exception as e:
        logger.warning(f"Failed to fetch user profile for company_id: {e}")

    # 1. Upload Image to Storage
    # 1. Save Image Locally
    try:
        user_prefix = final_user_id or "guest"
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save file to disk
        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
            
        # Construct local URL
        # NOTE: In production, use the actual domain/IP. For local, localhost is fine.
        # We'll use the request base URL if available, or fallback to localhost
        image_url = f"http://localhost:8000/uploads/{filename}"
        logger.info(f"Image saved locally: {file_path}, URL: {image_url}")
        
    except Exception as e:
        logger.error(f"File Save Error: {e}", exc_info=True)
        # Fallback if file save fails
        image_url = None
        raise HTTPException(status_code=500, detail="Failed to save image file locally")

    # 2. Save Metadata to Firestore
    try:
        if detections:
            det_data = json.loads(detections)
            defect_count = len(det_data)
        else:
            defect_count = 0
            
        # Create Firestore-compatible timestamp
        # Use datetime.now() - Firestore Admin SDK accepts Python datetime objects
        current_time = datetime.now()
        doc_data = {
            "date": current_time.strftime("%Y-%m-%d"),
            "createdAt": current_time,  # Firestore Admin SDK accepts datetime objects
            "user_id": final_user_id,
            "user_email": final_user_email,
            "company_id": user_company_id, # Store company_id
            "status": status,
            "defects": defect_count,
            "image_url": image_url,
            "detections": json.loads(detections) if detections else []
        }
        
        doc_ref = db.collection("history").add(doc_data)
        logger.info(f"Scan saved to Firestore with ID: {doc_ref[1].id}")
        return {"message": "Scan saved successfully", "id": doc_ref[1].id, "image_url": image_url}
    except google_exceptions.NotFound as e:
        error_msg = str(e)
        # Check if it's the database doesn't exist error
        if "does not exist" in error_msg and "database" in error_msg.lower():
            user_friendly_msg = (
                "Firestore database has not been created yet. "
                "Please create a Firestore database in your Firebase project."
            )
            logger.error(f"Firestore database not found: {error_msg}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Firestore Database Not Found",
                    "message": user_friendly_msg,
                    "setup_url": "https://console.cloud.google.com/datastore/setup?project=car-defect-total",
                    "technical_error": error_msg
                }
            )
        else:
            logger.error(f"Firestore Not Found: {error_msg}")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Firestore Resource Not Found",
                    "message": "The requested Firestore resource was not found.",
                    "technical_error": error_msg
                }
            )
    except google_exceptions.PermissionDenied as e:
        error_msg = str(e)
        # Check if it's the Firestore API disabled error
        if "SERVICE_DISABLED" in error_msg or "Cloud Firestore API has not been used" in error_msg:
            user_friendly_msg = (
                "Firestore API is not enabled in your Google Cloud project. "
                "Please enable it at: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=car-defect-total"
            )
            logger.error(f"Firestore API disabled: {error_msg}")
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Firestore API Disabled",
                    "message": user_friendly_msg,
                    "activation_url": "https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=car-defect-total",
                    "technical_error": error_msg
                }
            )
        else:
            logger.error(f"Firestore Permission Denied: {error_msg}")
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "Firestore Permission Denied",
                    "message": "You don't have permission to access Firestore. Please check your Firebase service account permissions.",
                    "technical_error": error_msg
                }
            )
    except Exception as e:
        import traceback
        error_msg = f"Database Error: {e}\n{traceback.format_exc()}"
        logger.error(error_msg)
        
        # Get more specific error information
        error_type = type(e).__name__
        error_details = str(e)
        
        # Check for common Firestore errors
        if "AttributeError" in error_type or "object has no attribute" in error_details.lower():
            user_msg = "Firestore client may not be properly initialized. Please check your Firebase configuration."
        elif "Invalid" in error_type or "invalid" in error_details.lower():
            user_msg = f"Invalid data format: {error_details}"
        else:
            user_msg = f"Database error: {error_details}"
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Database Error",
                "message": user_msg,
                "technical_error": error_details,
                "error_type": error_type,
                "full_traceback": traceback.format_exc()
            }
        )

@app.get("/api/v1/history")
async def get_history(
    limit: int = Query(default=20, ge=1, le=100),
    authorization: str | None = Header(default=None),
):
    if db is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Firestore Not Initialized",
                "message": "Firestore client is not properly initialized. Please check your Firebase configuration and service account key.",
            },
        )

    uid, _email = _require_user_from_bearer(authorization)

    try:
        q = (
            db.collection("history")
            .where("user_id", "==", uid)
            .order_by("createdAt", direction="DESCENDING")
            .limit(limit)
        )
        docs = q.stream()
        items = []
        for doc in docs:
            data = doc.to_dict() or {}
            items.append({"id": doc.id, **_json_safe(data)})
        return {"history": items}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"History fetch error: {error_msg}", exc_info=True)
        
        # Check for index-related errors
        index_url = None
        if "index" in error_msg.lower() or "requires an index" in error_msg.lower():
            # Try to extract the index creation URL from the error message
            import re
            url_match = re.search(r'https://console\.firebase\.google\.com[^\s]+', error_msg)
            if url_match:
                index_url = url_match.group(0)
                logger.info(f"Index creation URL found: {index_url}")
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Database Error",
                "message": "Failed to fetch history. Check backend logs for details.",
                "technical_error": error_msg,
                "index_url": index_url,
            },
        )

@app.get("/api/v1/company/history")
async def get_company_history(
    limit: int = Query(default=50, ge=1, le=100),
    defect_type: str | None = Query(default=None),
    start_date: str | None = Query(default=None), # Format YYYY-MM-DD
    end_date: str | None = Query(default=None),   # Format YYYY-MM-DD
    target_user_id: str | None = Query(default=None, alias="user_id"),
    authorization: str | None = Header(default=None),
):
    """
    Get history for the entire company.
    Only accessible by users with role 'admin'.
    Supports filtering by defect_type, date range, and specific user.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    uid, _ = _require_user_from_bearer(authorization)

    try:
        # 1. Verify User is Admin and get Company ID
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        user_data = user_doc.to_dict()
        if user_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied. Admin role required.")
        
        company_id = user_data.get("company_id")
        if not company_id:
             raise HTTPException(status_code=400, detail="User is not associated with any company.")

        # 2. Build Query
        # Note: Complex queries in Firestore require composite indexes.
        # We might need to filter in memory if indexes are missing and dataset is small,
        # but for scalability, we should use indexes. For this MVP, we will try to filter 
        # as much as possible in Firestore and handle edge cases.
        
        query = db.collection("history").where("company_id", "==", company_id)

        # Apply filters
        if target_user_id:
            query = query.where("user_id", "==", target_user_id)
        
        # Date filtering needs to happen on 'createdAt' or 'date' field.
        # 'createdAt' is a timestamp, 'date' is a string YYYY-MM-DD.
        # String comparison works for ISO dates.
        if start_date:
            try:
                # Convert string to datetime for comparison if using timestamp field, 
                # or just string compare if using date field.
                # Let's use the 'date' string field for simplicity if it exists and matches format
                query = query.where("date", ">=", start_date)
            except:
                pass
        
        if end_date:
             query = query.where("date", "<=", end_date)

        # Ordering
        query = query.order_by("createdAt", direction="DESCENDING")
        query = query.limit(limit)

        docs = query.stream()
        items = []
        
        # Post-query filtering for defect_type (since array-contains might be needed or complex AND queries)
        # If 'detections' is an array of objects, we can't easily filter by "detection inside array has label X"
        # with simple queries unless we denormalized 'defect_types' into a top-level array.
        # For now, valid defect types: "Dent", "Scratch", etc.
        # We will filter in python for defect_type to avoid complex index requirements for now.
        
        for doc in docs:
            data = doc.to_dict() or {}
            
            # Defect Type Filter (In-Memory)
            if defect_type and defect_type != "All":
                detections = data.get("detections", [])
                # Check if any detection matches the requested type
                has_defect = any(d.get("class") == defect_type or d.get("label") == defect_type for d in detections)
                if not has_defect:
                    continue

            # Fetch user name if not present (optional optimization: cache user names)
            # For now, just return what is in history. Frontend can fetch user details or we can join here.
            # Let's add the 'user_name' if we can easily find it? 
            # Actually, `save_scan` doesn't save user_name. 
            # We can rely on frontend fetching user list or just displaying ID/Email.
            
            items.append({"id": doc.id, **_json_safe(data)})
            
        return {"history": items}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Company history fetch error: {error_msg}", exc_info=True)
        # Handle index errors
        if "index" in error_msg.lower():
             import re
             url_match = re.search(r'https://console\.firebase\.google\.com[^\s]+', error_msg)
             if url_match:
                logger.info(f"Index needed: {url_match.group(0)}")
                # Retrying without ordering/filtering might be a fallback, but for now just fail with info
                raise HTTPException(status_code=400, detail=f"Database index required. Check backend logs.")
        
        raise HTTPException(status_code=500, detail=f"Failed to fetch company history: {error_msg}")


@app.delete("/api/v1/history/{doc_id}")
async def delete_history_item(
    doc_id: str,
    authorization: str | None = Header(default=None),
):
    """Delete a history item by document ID. Only the owner can delete their own scans."""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Firestore Not Initialized",
                "message": "Firestore client is not properly initialized.",
            },
        )

    uid, _email = _require_user_from_bearer(authorization)

    try:
        # Get the document first to verify ownership
        doc_ref = db.collection("history").document(doc_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(
                status_code=404,
                detail={"error": "Not Found", "message": "Report not found."},
            )
        
        doc_data = doc.to_dict()
        
        # Verify ownership or Admin privileges
        if doc_data.get("user_id") != uid:
            # Check if user is Admin of the same company
            user_doc = db.collection("users").document(uid).get()
            is_authorized = False
            
            if user_doc.exists:
                user_data = user_doc.to_dict()
                if user_data.get("role") == "admin":
                   # Check if company matches
                   report_company = doc_data.get("company_id")
                   admin_company = user_data.get("company_id")
                   
                   # Allow if both have company_id and they match
                   # Or if admin has company_id but report doesn't (legacy/orphan) - stricter: require match
                   if admin_company and report_company == admin_company:
                       is_authorized = True
            
            if not is_authorized:
                raise HTTPException(
                    status_code=403,
                    detail={"error": "Forbidden", "message": "You do not have permission to delete this report."},
                )
        
        # Try to delete the image from storage if it exists
        # Try to delete the local image file if it exists
        image_url = doc_data.get("image_url")
        if image_url and "localhost:8000/uploads" in image_url:
            try:
                # Extract filename from URL
                filename = image_url.split("/")[-1]
                file_path = os.path.join(UPLOAD_DIR, filename)
                
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Local image deleted: {file_path}")
                else:
                    logger.warning(f"Local file not found for deletion: {file_path}")
            except Exception as file_error:
                # Log but don't fail - the Firestore document is more important
                logger.warning(f"Could not delete local image file: {file_error}")
        
        # Legacy support: Try to delete from Firebase Storage if it was an old record
        elif image_url and storage and "storage.googleapis.com" in image_url:
            try:
                if "storage.googleapis.com" in image_url:
                    parts = image_url.split("/")
                    bucket_name = parts[3]
                    blob_path = "/".join(parts[4:])
                    bucket = storage.bucket(name=bucket_name)
                    blob = bucket.blob(blob_path)
                    blob.delete()
                    logger.info(f"Legacy image deleted from storage: {blob_path}")
            except Exception as storage_error:
                 logger.warning(f"Could not delete image from storage: {storage_error}")
        
        # Delete the Firestore document
        doc_ref.delete()
        logger.info(f"History item deleted: {doc_id}")
        
        return {"message": "Report deleted successfully", "id": doc_id}
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Delete error: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Database Error",
                "message": "Failed to delete report.",
                "technical_error": error_msg,
            },
        )

@app.post("/api/v1/user/update")
async def update_profile(
    file: UploadFile | None = None,
    name: str = Form(None),
    company: str = Form(None),
    company_id: str = Form(None),
    role: str = Form(None), # Add role
    authorization: str | None = Header(default=None),
):
    if db is None:
        raise HTTPException(
            status_code=503,
            detail={"error": "Firestore Not Initialized", "message": "Database not available."}
        )

    uid, email = _require_user_from_bearer(authorization)

    try:
        user_ref = db.collection("users").document(uid)
        
        # Prepare update data
        update_data = {
            "email": email, 
            "updatedAt": datetime.now()
        }
        if name: update_data["name"] = name
        if company: update_data["company"] = company
        if company_id: update_data["company_id"] = company_id
        if role: update_data["role"] = role # Allow updating role

        # Handle Profile Picture Upload
        if file:
            try:
                # 1. Save Image Locally
                filename = f"profile_{uid}_{uuid.uuid4()}_{file.filename}"
                file_path = os.path.join(UPLOAD_DIR, filename)
                
                with open(file_path, "wb") as f:
                    contents = await file.read()
                    f.write(contents)
                
                # Local URL
                image_url = f"http://localhost:8000/uploads/{filename}"
                update_data["photo_url"] = image_url
                
                # Optional: Delete old profile pic logic could go here
                
            except Exception as e:
                logger.error(f"Profile Pic Save Error: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Failed to save profile picture")

        # Update Firestore
        # Set merge=True to create if not exists or update existing fields
        user_ref.set(update_data, merge=True)
        
        return {"message": "Profile updated successfully", "data": update_data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile Update Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/user/profile")
async def get_profile(authorization: str | None = Header(default=None)):
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    uid, _ = _require_user_from_bearer(authorization)

    try:
        doc = db.collection("users").document(uid).get()
        if doc.exists:
            return doc.to_dict()
        else:
            return {} # Return empty if no profile yet
    except Exception as e:
        logger.error(f"Get Profile Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

from fastapi.responses import StreamingResponse
from pdf_service import ReportGenerator

@app.get("/api/v1/report/{scan_id}")
async def generate_report(
    scan_id: str,
    authorization: str | None = Header(default=None),
):
    """
    Generate and download a PDF report for a specific scan.
    Accessible by the scan owner OR an Admin from the same company.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    uid, _ = _require_user_from_bearer(authorization)

    try:
        # 1. Fetch Scan Data
        doc_ref = db.collection("history").document(scan_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
            
        scan_data = doc.to_dict()
        scan_data['id'] = doc.id
        
        # 2. Access Control
        # access if:
        # a. User is the owner
        # b. User is Admin AND same company
        
        is_owner = scan_data.get("user_id") == uid
        
        if not is_owner:
            # Check if Admin of same company
            user_doc = db.collection("users").document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                is_admin = user_data.get("role") == "admin"
                same_company = user_data.get("company_id") == scan_data.get("company_id")
                
                if not (is_admin and same_company):
                     raise HTTPException(status_code=403, detail="Access denied. You do not have permission to view this report.")
            else:
                 raise HTTPException(status_code=403, detail="Access denied.")

        # 3. Generate PDF
        generator = ReportGenerator()
        pdf_buffer = generator.generate(scan_data)
        
        # 4. Return as File Download
        filename = f"Inspection_Report_{scan_id[-6:]}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF Generation Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate report")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



# Forced reload for update v3
