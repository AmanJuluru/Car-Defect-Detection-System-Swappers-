"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Calendar, Search, X, Eye, Trash2, Maximize2 } from "lucide-react";
import ImageViewer from "@/components/ImageViewer";
import { useAuth } from "@/lib/useAuth";

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
    return map[cls.toLowerCase()] || '#94a3b8';
};

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [fullScreenItem, setFullScreenItem] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) {
                setHistory([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const token = await user.getIdToken();
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace("localhost", "127.0.0.1");
                const res = await fetch(`${apiBase}/history?limit=20`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json().catch(() => null);
                if (!res.ok) {
                    console.error(`History fetch failed (${res.status} ${res.statusText}):`, json || "No response body");
                    setHistory([]);
                    return;
                }
                if (!json) {
                    console.error("History fetch failed: Invalid JSON response");
                    setHistory([]);
                    return;
                }
                setHistory(Array.isArray(json.history) ? json.history : []);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();

        const handleScanSaved = () => {
            fetchHistory();
        };

        window.addEventListener('scanSaved', handleScanSaved);

        return () => {
            window.removeEventListener('scanSaved', handleScanSaved);
        };
    }, [user]);

    // Get unique defect types from detections
    const getDefectTypes = (item: any): string[] => {
        if (!item.detections || !Array.isArray(item.detections)) return [];
        const types = new Set(item.detections.map((d: any) => d.class || "Unknown"));
        return Array.from(types) as string[];
    };

    // Handle delete report
    const handleDelete = async (item: any) => {
        if (!user || !item?.id) return;

        const confirmed = window.confirm(`Are you sure you want to delete this report from ${item.date}? This action cannot be undone.`);
        if (!confirmed) return;

        setDeleting(true);
        try {
            const token = await user.getIdToken();
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace("localhost", "127.0.0.1");
            const res = await fetch(`${apiBase}/history/${item.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                console.error(`Delete failed (${res.status}):`, json);
                alert(json?.detail?.message || 'Failed to delete report');
                return;
            }

            // Remove from local state
            setHistory(prev => prev.filter(h => h.id !== item.id));
            setSelectedItem(null);

            // Notify other components
            window.dispatchEvent(new CustomEvent('scanSaved'));
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete report');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inspection History</h2>
                    <p className="text-muted-foreground">Archive of all past vehicle scans</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search report ID..."
                        className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-muted-foreground">Date</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground">Preview</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground">Defect Types</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading history...</td>
                            </tr>
                        ) : history.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                    <p className="text-lg mb-2">No inspection history yet</p>
                                    <p className="text-sm">Upload and analyze an image to see results here</p>
                                </td>
                            </tr>
                        ) : history.map((item) => {
                            const defectTypes = getDefectTypes(item);
                            return (
                                <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-foreground font-medium">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            {item.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setSelectedItem(item)}
                                            className="w-16 h-10 bg-secondary rounded-md overflow-hidden relative group cursor-pointer"
                                        >
                                            {item.image_url ? (
                                                <>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={item.image_url} alt="Scan" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye className="w-4 h-4 text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">No Img</div>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {defectTypes.length > 0 ? (
                                                defectTypes.map((type, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                                                        style={{
                                                            backgroundColor: `${getColorForClass(type)}20`,
                                                            color: getColorForClass(type),
                                                            border: `1px solid ${getColorForClass(type)}40`
                                                        }}
                                                    >
                                                        {type}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-xs">No defects</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'Clean'
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                            : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedItem(item)}
                                                className="text-primary hover:text-blue-400 font-medium text-xs uppercase tracking-wide"
                                            >
                                                View Report
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                title="Delete report"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Report Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div
                        className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <div>
                                <h3 className="text-xl font-bold">Inspection Report</h3>
                                <p className="text-muted-foreground text-sm">{selectedItem.date}</p>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Image Section */}
                                <div className="bg-black rounded-xl overflow-hidden relative group cursor-zoom-in" onClick={() => setFullScreenItem(selectedItem)}>
                                    {selectedItem.image_url ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={selectedItem.image_url}
                                                alt="Scan"
                                                className="w-full h-auto max-h-[400px] object-contain"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="bg-black/50 backdrop-blur-sm p-3 rounded-full">
                                                    <Maximize2 className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                                            No image available
                                        </div>
                                    )}
                                </div>

                                {/* Details Section */}
                                <div className="space-y-6">
                                    {/* Status */}
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
                                        <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${selectedItem.status === 'Clean'
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                            : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                            }`}>
                                            {selectedItem.status}
                                        </span>
                                    </div>

                                    {/* Defects Found */}
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                            Defects Found ({selectedItem.defects || 0})
                                        </h4>
                                        {selectedItem.detections && selectedItem.detections.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedItem.detections.map((det: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: getColorForClass(det.class) }}
                                                            />
                                                            <span className="font-medium capitalize">{det.class}</span>
                                                        </div>
                                                        <span
                                                            className="text-xs px-2 py-1 rounded"
                                                            style={{
                                                                backgroundColor: `${getColorForClass(det.class)}20`,
                                                                color: getColorForClass(det.class)
                                                            }}
                                                        >
                                                            {(det.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">No defects detected</p>
                                        )}
                                    </div>

                                    {/* Report ID */}
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Report ID</h4>
                                        <code className="text-xs bg-secondary px-2 py-1 rounded">{selectedItem.id}</code>
                                    </div>

                                    {/* Delete Button */}
                                    <div className="pt-4 border-t border-border">
                                        <button
                                            onClick={() => handleDelete(selectedItem)}
                                            disabled={deleting}
                                            className="w-full py-2 px-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {deleting ? 'Deleting...' : 'Delete Report'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {fullScreenItem && (
                <ImageViewer
                    src={fullScreenItem.image_url}
                    alt="Full Audit Image"
                    detections={fullScreenItem.detections || []}
                    onClose={() => setFullScreenItem(null)}
                />
            )}
        </div>
    );
}
