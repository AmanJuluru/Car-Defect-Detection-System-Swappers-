"use client";
import { useState, useRef } from "react";
import { Upload, X, FileImage, FileVideo, ScanSearch, Save, Check } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [detections, setDetections] = useState<any[]>([]);

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
        return map[cls.toLowerCase()] || '#ef4444'; // Default to red
    };


    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) processFile(droppedFile);
    };

    const processFile = (selectedFile: File) => {
        if (selectedFile.type.startsWith("image/") || selectedFile.type.startsWith("video/")) {
            setFile(selectedFile);
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreview(objectUrl);
            setDetections([]); // Clear previous detections

            if (selectedFile.type.startsWith("image/")) {
                const img = new window.Image();
                img.onload = () => {
                    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                };
                img.src = objectUrl;
            } else {
                setImageDimensions(null);
            }
        } else {
            alert("Please upload an image or video file.");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            processFile(e.target.files[0]);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        setDetections([]);
        setImageDimensions(null);
        setFileBuffer(null);
        setIsSaved(false);
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);
        setIsSaved(false);

        try {
            // Read file content once to avoid stream consumption issues
            const buffer = await file.arrayBuffer();
            setFileBuffer(buffer);

            // Create fresh File objects from the buffer for each request
            const predictFile = new File([buffer], file.name, { type: file.type });
            const formData = new FormData();
            formData.append("file", predictFile);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/predict`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.detail || "Analysis failed";
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setDetections(data.detections);
        } catch (error) {
            console.error(error);
            alert(`Error analyzing media: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!file || !fileBuffer || detections.length === 0) return;

        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("Please log in to save scans to your history.");
            return;
        }

        setSaving(true);
        try {
            const idToken = await currentUser.getIdToken();

            const saveFile = new File([fileBuffer], file.name, { type: file.type });
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
            setIsSaved(true);

            // Dispatch custom event to refresh dashboard and history
            window.dispatchEvent(new CustomEvent('scanSaved'));
        } catch (error) {
            console.error("Failed to save scan:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Upload Media</h2>
                    <p className="text-muted-foreground">Upload images or video to detect car defects</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Area */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div
                        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 transition-all cursor-pointer ${isDragging
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card/50 hover:bg-card/80"
                            } ${preview ? "hidden" : "flex"}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                            <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Click to upload or drag and drop</h3>
                        <p className="text-muted-foreground text-sm">
                            Supports JPG, PNG, MP4 (Max 50MB)
                        </p>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {preview && (
                        <div className="relative flex-1 bg-black/50 rounded-xl overflow-hidden flex items-center justify-center border border-border min-h-[400px]">
                            {file?.type.startsWith("video/") ? (
                                <video src={preview} controls className="max-h-[600px] w-auto" />
                            ) : (
                                <div className="relative inline-block">
                                    {/* Using regular img for easier bounding box positioning relative to natural size */}
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="max-w-full max-h-[600px] w-auto h-auto object-contain"
                                    />

                                    {/* Bounding Boxes Overlay */}
                                    {imageDimensions && detections.map((det, idx) => {
                                        const [x1, y1, x2, y2] = det.bbox;
                                        const left = (x1 / imageDimensions.width) * 100;
                                        const top = (y1 / imageDimensions.height) * 100;
                                        const width = ((x2 - x1) / imageDimensions.width) * 100;
                                        const height = ((y2 - y1) / imageDimensions.height) * 100;
                                        const color = getColorForClass(det.class);

                                        return (
                                            <div
                                                key={idx}
                                                className="absolute border-2 group transition-colors"
                                                style={{
                                                    left: `${left}%`,
                                                    top: `${top}%`,
                                                    width: `${width}%`,
                                                    height: `${height}%`,
                                                    borderColor: color,
                                                    backgroundColor: `${color}33`, // 20% opacity
                                                }}
                                            >
                                                <div
                                                    className="absolute -top-7 left-0 text-white text-xs px-2 py-1 rounded shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {det.class} ({Math.round(det.confidence * 100)}%)
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <button
                                onClick={clearFile}
                                className="absolute top-4 right-4 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Info / Actions Panel */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <ScanSearch className="w-5 h-5 text-primary" />
                            Analysis Control
                        </h3>

                        <div className="space-y-4">
                            {file ? (
                                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                                    {file.type.startsWith("video/") ? <FileVideo className="w-8 h-8 text-blue-400" /> : <FileImage className="w-8 h-8 text-green-400" />}
                                    <div className="overflow-hidden">
                                        <p className="font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                                    No file selected
                                </div>
                            )}

                            <button
                                onClick={handleAnalyze}
                                disabled={!file || analyzing}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                            >
                                {analyzing ? "Analyzing..." : "Analyze Media"}
                            </button>

                            {/* Save Button - appears after analysis */}
                            {detections.length > 0 && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving || isSaved}
                                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${isSaved
                                        ? 'bg-green-500 text-white cursor-default'
                                        : 'bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    {isSaved ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Saved to History
                                        </>
                                    ) : saving ? (
                                        "Saving..."
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Save to History
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results placeholder */}
                    <div className="bg-card border border-border rounded-xl p-6 h-[300px] overflow-y-auto">
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Results</h3>
                        {detections.length > 0 ? (
                            <div className="space-y-2">
                                {detections.map((det, idx) => {
                                    const color = getColorForClass(det.class);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                <span className="font-medium capitalize" style={{ color }}>{det.class}</span>
                                            </div>
                                            <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: `${color}20`, color }}>
                                                {(det.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <p>{analyzing ? "Processing..." : "No defects detected"}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
