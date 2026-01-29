🚗 Swappers - AI Car Defect Detection
==========================================

**Python FastAPI • Next.js • YOLOv8 • Firebase • Local Storage**

An AI-powered web portal for automobile exterior defect detection using deep learning.

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Tech Stack](#tech-stack)

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
| 🔵 **Lamp Broken** | Blue bounding box |
| 🟢 **Glass Broken** | Green bounding box |
| 🟣 **Tire Flat** | Purple bounding box |
| 🩷 **Dent** | Pink bounding box |

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
- **Firebase Project**: A Firebase project with Auth and Firestore enabled.
- **Service Account**: `serviceAccountKey.json` placed in the `backend/` directory.

### Backend Setup

1.  **Navigate to backend:**
    ```bash
    cd backend
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Environment:**
    Ensure your `serviceAccountKey.json` is present in the `backend` folder.

4.  **Run the Server:**
    ```bash
    python main.py
    ```
    The API will start at `http://localhost:8000`.

### Frontend Setup

1.  **Navigate to frontend:**
    ```bash
    cd frontend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run the Development Server:**
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

### Database & Storage
| Technology | Purpose |
|:---|:---|
| **Firestore** | NoSQL database for metadata |
| **Local Storage** | Secure image storage (`backend/uploads`) |

---

## 📄 License
This project is licensed under the MIT License.

**Made for the Automobile Industry**
