"use client";
import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera, RefreshCw, Save } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function CameraPage() {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [latestDetections, setLatestDetections] = useState<any[]>([]);
    const scanningIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fixed video dimensions for consistent coordinate mapping
    const videoWidth = 640;
    const videoHeight = 480;

    // Color mapping for defect types
    const getColorForClass = (cls: string) => {
        const map: Record<string, string> = {
            'scratch': '#ef4444',      // Red
            'dent': '#ec4899',          // Pink
            'lamp broken': '#3b82f6',   // Blue
            'lamp_broken': '#3b82f6',   // Blue
            'glass broken': '#22c55e',  // Green
            'glass_broken': '#22c55e',  // Green
            'tireflat': '#a855f7',      // Purple
            'tire flat': '#a855f7',     // Purple
            'tire_flat': '#a855f7',     // Purple
            'tire': '#a855f7',          // Purple
            'tire defect': '#a855f7',   // Purple
        };
        return map[cls.toLowerCase()] || '#ef4444';
    };

    const captureFrame = useCallback(async () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        // Create blob from base64
        const res = await fetch(imageSrc);
        const blob = await res.blob();
        const file = new File([blob], "frame.jpg", { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/predict`, {
                method: "POST",
                body: formData,
            });
            if (response.ok) {
                const data = await response.json();
                setLatestDetections(data.detections);
            }
        } catch (error) {
            console.error("Frame inference failed", error);
        }
    }, [webcamRef]);

    const startScanning = () => {
        setIsScanning(true);
        // Run inference every 500ms
        scanningIntervalRef.current = setInterval(captureFrame, 500);
    };

    const stopScanning = () => {
        setIsScanning(false);
        if (scanningIntervalRef.current) {
            clearInterval(scanningIntervalRef.current);
            scanningIntervalRef.current = null;
        }
        setLatestDetections([]);
    };

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setImgSrc(imageSrc);
            stopScanning(); // Stop live scan when capturing a still
        }
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
        setLatestDetections([]);
    };

    const saveScan = async () => {
        if (!imgSrc) return;

        // Convert base64 to blob
        const res = await fetch(imgSrc);
        const blob = await res.blob();
        const file = new File([blob], "webcam_capture.jpg", { type: "image/jpeg" });

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("Please log in to save scans to your history.");
                return;
            }
            const idToken = await currentUser.getIdToken();

            // First, run prediction to get detection results
            const predictFormData = new FormData();
            predictFormData.append("file", file);

            const predictRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/predict`, {
                method: "POST",
                body: predictFormData,
            });

            if (!predictRes.ok) {
                throw new Error("Prediction failed");
            }

            const predictData = await predictRes.json();
            const detections = predictData.detections || [];

            // Create a fresh blob/file for the save request (FormData file streams are consumed)
            const saveRes = await fetch(imgSrc);
            const saveBlob = await saveRes.blob();
            const saveFile = new File([saveBlob], "webcam_capture.jpg", { type: "image/jpeg" });

            // Now save to history with a NEW FormData
            const saveFormData = new FormData();
            saveFormData.append("file", saveFile);
            saveFormData.append("detections", JSON.stringify(detections));
            saveFormData.append("status", detections.length > 0 ? "Attention" : "Clean");
            saveFormData.append("user_id", currentUser.uid);
            saveFormData.append("user_email", currentUser.email || "");

            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/save_scan`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
                body: saveFormData,
            });

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json().catch(() => ({ detail: "Failed to save scan" }));

                // Handle structured error responses
                if (errorData.detail && typeof errorData.detail === 'object') {
                    const errorMsg = errorData.detail.message || errorData.detail.error || "Failed to save scan";
                    const technicalError = errorData.detail.technical_error || "";
                    const activationUrl = errorData.detail.activation_url;
                    const setupUrl = errorData.detail.setup_url;

                    // Show detailed error in console for debugging
                    console.error("Save error details:", errorData.detail);

                    // Build error message with technical details in development
                    const fullErrorMsg = process.env.NODE_ENV === 'development' && technicalError
                        ? `${errorMsg}\n\nTechnical details: ${technicalError}`
                        : errorMsg;

                    // Check for setup URL (database creation)
                    if (setupUrl) {
                        const userConfirmed = confirm(
                            `${fullErrorMsg}\n\nWould you like to open the database setup page?`
                        );
                        if (userConfirmed) {
                            window.open(setupUrl, '_blank');
                        }
                    } else if (activationUrl) {
                        const userConfirmed = confirm(
                            `${fullErrorMsg}\n\nWould you like to open the activation page?`
                        );
                        if (userConfirmed) {
                            window.open(activationUrl, '_blank');
                        }
                    } else {
                        alert(fullErrorMsg);
                    }
                    throw new Error(errorMsg);
                } else {
                    const errorMsg = errorData.detail || "Failed to save scan";
                    console.error("Save error:", errorData);
                    alert(errorMsg);
                    throw new Error(errorMsg);
                }
            }

            const saveData = await saveResponse.json();
            console.log("Scan saved to history!", saveData);

            // Dispatch custom event to refresh dashboard and history
            window.dispatchEvent(new CustomEvent('scanSaved'));

            alert("Scan saved to history!");
            setImgSrc(null);
        } catch (e) {
            console.error(e);
            // Error already shown in alert above, just log it
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Live Detection</h2>
                    <div className="flex items-center gap-2 mt-1">
                        {isScanning ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                LIVE
                            </span>
                        ) : (
                            <span className="text-muted-foreground">Ready to seek defects</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Camera Feed */}
                <div className="lg:col-span-2 bg-black rounded-xl overflow-hidden relative border border-border shadow-2xl flex items-center justify-center">
                    {!imgSrc ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    facingMode: "environment",
                                    width: videoWidth,
                                    height: videoHeight
                                }}
                                className="w-full h-full object-contain"
                            />

                            {/* Live Overlays */}
                            {isScanning && latestDetections.map((det, idx) => {
                                // IMPORTANT: Coordinates from YOLO are typically relative to the image size sent.
                                // We configured webcam to capture at specific resolution or need to know the ratio.
                                // Assuming simplest case: webcam renders fully in container.
                                // We use percentage logic again for best responsiveness.
                                const [x1, y1, x2, y2] = det.bbox;
                                // Note: We need to know the SOURCE image dimensions used for prediction. 
                                // Webcam screenshot matches videoConstraints usually.
                                const left = (x1 / videoWidth) * 100;
                                const top = (y1 / videoHeight) * 100;
                                const width = ((x2 - x1) / videoWidth) * 100;
                                const height = ((y2 - y1) / videoHeight) * 100;
                                const color = getColorForClass(det.class);

                                return (
                                    <div
                                        key={idx}
                                        className="absolute border-2 transition-all duration-75"
                                        style={{
                                            left: `${left}%`,
                                            top: `${top}%`,
                                            width: `${width}%`,
                                            height: `${height}%`,
                                            pointerEvents: 'none',
                                            borderColor: color,
                                            backgroundColor: `${color}33`,
                                        }}
                                    >
                                        <span
                                            className="absolute -top-6 left-0 text-white text-xs px-1 rounded"
                                            style={{ backgroundColor: color }}
                                        >
                                            {det.class} {Math.round(det.confidence * 100)}%
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgSrc} alt="captured" className="w-full h-full object-contain" />
                    )}

                    {/* Camera Controls Overlay */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-10">
                        {!imgSrc ? (
                            <div className="flex gap-4">
                                <button
                                    onClick={isScanning ? stopScanning : startScanning}
                                    className={`px-6 py-3 rounded-full font-semibold transition-all ${isScanning ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-secondary text-white hover:bg-secondary/80'}`}
                                >
                                    {isScanning ? "Stop Scanning" : "Start Live Scan"}
                                </button>
                                <button
                                    onClick={capture}
                                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                                    title="Capture Photo"
                                >
                                    <div className="w-10 h-10 rounded-full border-2 border-black" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <button
                                    onClick={retake}
                                    className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-full hover:bg-secondary/80 font-semibold"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Retake
                                </button>
                                <button
                                    onClick={saveScan}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-blue-600 font-semibold shadow-lg shadow-blue-500/20"
                                >
                                    <Save className="w-4 h-4" />
                                    Save to History
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Live Log */}
                <div className="lg:col-span-1 bg-card border border-border rounded-xl flex flex-col max-h-[600px]">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold">Live Analysis Log</h3>
                        <p className="text-xs text-muted-foreground">Updates every 500ms</p>
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                        {!isScanning && latestDetections.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-10">
                                {isScanning ? "Scanning..." : "Start scanning to see real-time events."}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {latestDetections.map((det, idx) => {
                                    const color = getColorForClass(det.class);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                <span className="font-medium capitalize">{det.class}</span>
                                            </div>
                                            <span className="text-xs bg-background px-2 py-1 rounded border border-border">
                                                {(det.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
