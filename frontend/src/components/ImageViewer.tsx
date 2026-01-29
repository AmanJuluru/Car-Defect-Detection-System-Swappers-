import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Detection {
    bbox: number[]; // [x1, y1, x2, y2]
    class: string;
    confidence: number;
}

interface ImageViewerProps {
    src: string;
    alt: string;
    detections?: Detection[];
    onClose: () => void;
}

// Reuse the color mapping for consistency
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
    return map[cls.toLowerCase()] || '#cbd5e1';
};

export default function ImageViewer({ src, alt, detections = [], onClose }: ImageViewerProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imgDimensions, setImgDimensions] = useState<{ width: number, height: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize scale to fit when image loads
    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setImgDimensions({ width: naturalWidth, height: naturalHeight });

        // Calculate fit scale
        const padding = 40;
        const availableWidth = window.innerWidth - padding;
        const availableHeight = window.innerHeight - padding;

        const scaleX = availableWidth / naturalWidth;
        const scaleY = availableHeight / naturalHeight;
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't zoom in initially if image is small

        setScale(fitScale);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault(); // Prevent page scroll
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, scale + scaleAmount), 5);
        setScale(newScale);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const zoomIn = () => setScale(s => Math.min(s * 1.2, 5));
    const zoomOut = () => setScale(s => Math.max(s / 1.2, 0.1));
    const reset = () => {
        setPosition({ x: 0, y: 0 });
        if (imgDimensions) {
            const padding = 40;
            const availableWidth = window.innerWidth - padding;
            const availableHeight = window.innerHeight - padding;
            const scaleX = availableWidth / imgDimensions.width;
            const scaleY = availableHeight / imgDimensions.height;
            setScale(Math.min(scaleX, scaleY, 1));
        } else {
            setScale(1);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Toolbar */}
            <div className="flex justify-between items-center p-4 z-10 pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 flex gap-2 pointer-events-auto border border-white/10">
                    <button onClick={zoomOut} className="p-2 hover:bg-white/20 rounded-md transition-colors text-white" title="Zoom Out">
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="flex items-center text-white text-sm font-mono min-w-[3ch] justify-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button onClick={zoomIn} className="p-2 hover:bg-white/20 rounded-md transition-colors text-white" title="Zoom In">
                        <ZoomIn className="w-5 h-5" />
                    </button>
                    <div className="w-px bg-white/20 mx-1" />
                    <button onClick={reset} className="p-2 hover:bg-white/20 rounded-md transition-colors text-white" title="Reset View">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 bg-black/50 backdrop-blur-sm hover:bg-red-500/80 rounded-full transition-colors pointer-events-auto border border-white/10 text-white"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Viewer Area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden relative flex items-center justify-center cursor-move select-none"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        width: imgDimensions ? imgDimensions.width : 'auto',
                        height: imgDimensions ? imgDimensions.height : 'auto',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    className="relative origin-center"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={alt}
                        onLoad={onImageLoad}
                        draggable={false}
                        className="max-w-none block"
                    />

                    {/* Detection Overlays */}
                    {imgDimensions && detections.map((det, idx) => {
                        const [x1, y1, x2, y2] = det.bbox;
                        const width = x2 - x1;
                        const height = y2 - y1;
                        const color = getColorForClass(det.class);

                        return (
                            <div
                                key={idx}
                                className="absolute border-2 pointer-events-none group"
                                style={{
                                    left: x1,
                                    top: y1,
                                    width: width,
                                    height: height,
                                    borderColor: color,
                                    boxShadow: `0 0 0 1px ${color}40, inset 0 0 0 1px ${color}40`
                                }}
                            >
                                {/* Label Tag */}
                                <div
                                    className="absolute -top-6 left-0 px-2 py-0.5 text-xs font-bold text-white rounded shadow-sm whitespace-nowrap"
                                    style={{ backgroundColor: color }}
                                >
                                    {det.class} {Math.round(det.confidence * 100)}%
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer / Info */}
            <div className="p-4 text-center text-white/50 text-sm pointer-events-none z-10">
                Drag to pan • Scroll to zoom
            </div>
        </div>
    );
}
