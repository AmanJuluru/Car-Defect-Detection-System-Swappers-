🚗 Swappers - AI Car Defect Detection
==========================================

**Python FastAPI • Next.js • YOLOv8 • Firebase • Local Storage**

An AI-powered web portal for automobile exterior defect detection using deep learning.

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Tech Stack](#tech-stack) • [Troubleshooting](#troubleshooting)

## 📖 Overview

**Swappers** is a secure web portal designed for manufacturing inspection teams to detect exterior vehicle defects using state-of-the-art YOLOv8 deep learning technology. The system enables quality assurance teams to upload vehicle images and receive instant AI-powered defect analysis with visual bounding box annotations.

## 🎯 Key Highlights

- **Real-time Detection**: Sub-second inference time using YOLOv8.
- **Microservices Architecture**: Separate robust Backend (FastAPI) and modern Frontend (Next.js).
- **Secure Access**: Integrated Firebase Authentication.
- **Local Data Privacy**: Images are processed and stored locally within your secure environment.
- **Visual Results**: Clear, color-coded bounding boxes for instant defect identification.
- **Dashboard Analytics**: Visual insights into defect trends and inspection history.

## ✨ Features

### 🔍 Defect Detection
The pre-trained YOLO model can detect 5 types of automobile exterior defects:

| Defect Type | Visual Indicator |
|:---|:---|
| 🔴 **Scratch** | Red bounding box |
| 🔵 **Lamp Broken** | Blue bounding box (Class 2) |
| 🟢 **Glass Broken** | Green bounding box |
| 🟣 **Tire Flat** | Purple bounding box |
| 🩷 **Dent** | Pink bounding box (Class 0) |

> **Note:** The validation logic prioritizes defects. If a defect is found (e.g., broken glass), the image is accepted even if "forbidden objects" (like a person or TV reflection) are also detected.

### 📸 Live Camera & Image Viewer
- **Live Detection**: Real-time defect detection using your device's camera.
- **Interactive Viewer**: Full-screen image viewer with zoom, pan, and defect overlay toggles.

### 🛡️ User Management
- Secure user registration and login via Firebase.
- Profile management with custom avatars and company details.
- Role-based dashboard access.

### 📊 Dashboard & Analytics
- Real-time inspection statistics.
- Visual breakdown of defect distribution.
- Recent inspection activity feed.

### 📜 Inspection History
- Complete log of all past inspections.
- View detailed reports with original and annotated images.
- Delete and manage past records.

---

## 🚀 Installation

### Prerequisites
- **Python** 3.10 or higher
- **Node.js** 18 or higher
- **Firebase Project**: A Firebase project with Auth and Firestore enabled. (See `firebase_config.py` for details)

### 1. Backend Setup

1.  **Navigate to backend:**
    ```bash
    cd backend
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Environment:**
    - Place your `serviceAccountKey.json` from Firebase in the `backend/` directory.
    - Alternatively, set the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable to the path of your key.

4.  **Run the Server:**
    ```bash
    python main.py
    ```
    The API will start at `http://localhost:8000`. Verify it's running by visiting `http://localhost:8000/health`.

### 2. Frontend Setup

1.  **Navigate to frontend:**
    ```bash
    cd frontend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env.local` file in the `frontend` directory with your Firebase config:
    ```env
    NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:3000`.

---

## 💻 Usage

1.  **Register/Login**: Create a new account or log in.
2.  **Upload Image**: Navigate to **Upload**, drag & drop a car image, and click "Analyze".
3.  **View Results**: See immediate results with bounding boxes. Click "Save to History" to store the record.
4.  **Dashboard**: Monitor your inspection stats and recent history.
5.  **Settings**: Update your profile, company info, and profile picture in **Settings**.

---

## 🔧 Troubleshooting

### "Failed to fetch" Error
- **Cause:** The frontend cannot reach the backend server.
- **Solution:** Ensure the backend is running on port 8000 (`python main.py`) and that `NEXT_PUBLIC_API_URL` in `.env.local` is correct.

### "Invalid image. Detected [Object]"
- **Cause:** The image contains forbidden objects (e.g., people, animals, indoor items) and **no defects** were found.
- **Solution:** Upload a clearer image of the vehicle. If real defects are present, the system will accept the image even if background objects are detected.

### "Firestore Not Initialized"
- **Cause:** The backend could not load `serviceAccountKey.json`.
- **Solution:** Ensure the JSON key file is in the `backend/` folder and corresponds to the active Firebase project.

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|:---|:---|
| **Python** | Core logic and ML integration |
| **FastAPI** | High-performance API framework |
| **YOLOv8** | Object detection model |
| **OpenCV** | Image processing |
| **Firebase Admin** | Auth & Database management |

### Frontend
| Technology | Purpose |
|:---|:---|
| **Next.js** | React framework for web |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Modern styling |
| **Recharts** | Data visualization |
| **Framer Motion** | UI animations |

---

## 📄 License
This project is licensed under the MIT License.

**Made for the Automobile Industry**
