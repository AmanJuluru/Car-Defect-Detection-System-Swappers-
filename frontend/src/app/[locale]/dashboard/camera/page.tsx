"use client";
import { useCallback, useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { Camera, RefreshCw, Save, Play, Square } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function CameraPage() {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [latestDetections, setLatestDetections] = useState<any[]>([]);
    const scanningIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 16:9 Aspect Ratio for better screen fit
    const videoConstraints = {
        facingMode: "environment",
        width: 1280,
        height: 720
    };

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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
            const response = await fetch(`${apiUrl}/predict`, {
                method: "POST",
                body: formData,
            });
            if (response.ok) {
                const data = await response.json();
                setLatestDetections(data.detections || []);
            } else {
                console.warn("Frame inference failed:", response.status);
            }
        } catch (error) {
            console.error("Frame inference failed", error);
        }
    }, [webcamRef]);

    const stopScanning = useCallback(() => {
        setIsScanning(false);
        if (scanningIntervalRef.current) {
            clearInterval(scanningIntervalRef.current);
            scanningIntervalRef.current = null;
        }
        setLatestDetections([]);
    }, []);

    const startScanning = useCallback(() => {
        setIsScanning(true);
    }, []);

    // Effect to manage the interval based on isScanning state
    useEffect(() => {
        if (isScanning && !scanningIntervalRef.current) {
            // Give camera a moment to warm up, then start polling
            const timeoutId = setTimeout(() => {
                scanningIntervalRef.current = setInterval(captureFrame, 200);
            }, 1000); // 1 second delay to allow camera to mount
            return () => clearTimeout(timeoutId);
        } else if (!isScanning && scanningIntervalRef.current) {
            clearInterval(scanningIntervalRef.current);
            scanningIntervalRef.current = null;
        }

        return () => {
            if (scanningIntervalRef.current) {
                clearInterval(scanningIntervalRef.current);
                scanningIntervalRef.current = null;
            }
        };
    }, [isScanning, captureFrame]);


    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setImgSrc(imageSrc);
            stopScanning();
        }
    }, [webcamRef, stopScanning]);

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

            // Run prediction on the captured still
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

            // Create a fresh blob/file for the save request
            const saveRes = await fetch(imgSrc);
            const saveBlob = await saveRes.blob();
            const saveFile = new File([saveBlob], "webcam_capture.jpg", { type: "image/jpeg" });

            const saveFormData = new FormData();
            saveFormData.append("file", saveFile);
            saveFormData.append("detections", JSON.stringify(detections));
            saveFormData.append("status", detections.length > 0 ? "Attention" : "Clean");
            saveFormData.append("user_id", currentUser.uid);
            saveFormData.append("user_email", currentUser.email || "");

            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace("localhost", "127.0.0.1");
            const saveResponse = await fetch(`${apiUrl}/save_scan`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
                body: saveFormData,
            });

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json().catch(() => ({ detail: "Failed to save scan" }));
                throw new Error(errorData.detail?.message || "Failed to save scan");
            }

            const saveData = await saveResponse.json();
            console.log("Scan saved to history!", saveData);

            window.dispatchEvent(new CustomEvent('scanSaved'));

            alert("Scan saved to history!");
            setImgSrc(null);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to save scan");
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
                <div className="lg:col-span-2 bg-black rounded-xl overflow-hidden relative border border-border shadow-2xl flex flex-col">

                    {/* Main Content Area */}
                    <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
                        {!imgSrc ? (
                            isScanning ? (
                                /* Camera Active State */
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={videoConstraints}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "contain",
                                        }}
                                        className="h-full w-full"
                                    />

                                    {/* Live Overlays - Scaled to match video aspect ratio (16:9) */}
                                    <div className="absolute aspect-video w-full max-w-full h-auto max-h-full pointer-events-none">
                                        {latestDetections.map((det, idx) => {
                                            let left = 0, top = 0, width = 0, height = 0;

                                            if (det.normalized_bbox) {
                                                const [nx1, ny1, nx2, ny2] = det.normalized_bbox;
                                                left = nx1 * 100;
                                                top = ny1 * 100;
                                                width = (nx2 - nx1) * 100;
                                                height = (ny2 - ny1) * 100;
                                            } else {
                                                // Fallback for absolute coordinates (assuming 1280x720)
                                                const [x1, y1, x2, y2] = det.bbox;
                                                left = (x1 / 1280) * 100;
                                                top = (y1 / 720) * 100;
                                                width = ((x2 - x1) / 1280) * 100;
                                                height = ((y2 - y1) / 720) * 100;
                                            }

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
                                </div>
                            ) : (
                                /* Camera Inactive State - Placeholder */
                                <div className="flex flex-col items-center justify-center text-muted-foreground p-10 text-center animate-in fade-in">
                                    <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                                        <Camera className="w-10 h-10 opacity-50" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Camera is Off</h3>
                                    <p className="max-w-xs mx-auto mb-6">Click "Start Live Scan" to enable the camera and begin defect detection.</p>
                                    <button
                                        onClick={startScanning}
                                        className="px-8 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 font-bold shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        Start Live Scan
                                    </button>
                                </div>
                            )
                        ) : (
                            // Capture Preview State
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgSrc} alt="captured" className="w-full h-full object-contain" />
                        )}
                    </div>

                    {/* Controls Bar (Bottom Overlay) */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-10 pointer-events-none">
                        <div className="pointer-events-auto flex gap-4">
                            {!imgSrc ? (
                                isScanning && (
                                    <>
                                        <button
                                            onClick={stopScanning}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 font-bold shadow-lg transition-all"
                                        >
                                            <Square className="w-4 h-4 fill-current" />
                                            Stop Scanning
                                        </button>
                                        <button
                                            onClick={capture}
                                            className="w-14 h-14 rounded-full bg-white border-4 border-zinc-200 flex items-center justify-center hover:scale-105 transition-transform shadow-xl hover:border-primary"
                                            title="Capture Photo"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-white" />
                                        </button>
                                    </>
                                )
                            ) : (
                                <>
                                    <button
                                        onClick={retake}
                                        className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-full hover:bg-secondary/80 font-semibold shadow-lg backdrop-blur-sm"
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
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Live Log */}
                <div className="lg:col-span-1 bg-card border border-border rounded-xl flex flex-col max-h-[600px] shadow-sm">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold">Live Analysis Log</h3>
                            <p className="text-xs text-muted-foreground">Updates every 200ms</p>
                        </div>
                        {isScanning && (
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Receiving data" />
                        )}
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                        {!isScanning && !imgSrc ? (
                            <div className="text-center text-sm text-muted-foreground py-10 flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
                                    <Play className="w-5 h-5 opacity-50 ml-0.5" />
                                </div>
                                <p>Start scanning to see real-time events.</p>
                            </div>
                        ) : latestDetections.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-10">
                                <p>Scanning frame...</p>
                                <p className="text-xs opacity-70 mt-1">No defects detected yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {latestDetections.map((det, idx) => {
                                    const color = getColorForClass(det.class);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                                                <span className="font-medium capitalize">{det.class}</span>
                                            </div>
                                            <span className="text-xs bg-background px-2 py-1 rounded border border-border font-mono">
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
        </div >
    )
}
