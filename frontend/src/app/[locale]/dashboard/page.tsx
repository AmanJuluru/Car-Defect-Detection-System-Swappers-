"use client";
import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { FadeIn, SlideIn } from "@/components/ui/motion";
import Link from "next/link";
import { RotateCcw, X, Eye, Trash2, Maximize2 } from "lucide-react";
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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover border border-border p-3 rounded-lg shadow-xl">
                <p className="font-medium text-popover-foreground mb-1">{label}</p>
                <p className="text-red-500 font-bold">
                    {`count : ${payload[0].value}`}
                </p>
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [stats, setStats] = useState({
        total: 0,
        defects: 0,
        pending: 0
    });
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedScan, setSelectedScan] = useState<any | null>(null);
    const [fullScreenScan, setFullScreenScan] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { user } = useAuth();

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
            const res = await fetch(`${apiBase}/history?limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                console.error(`Dashboard fetch failed (${res.status} ${res.statusText}):`, json || "No response body");
                setRecentScans([]);
                setStats({ total: 0, defects: 0, pending: 0 });
                setChartData([]);
                return;
            }
            if (!json) {
                console.error("Dashboard fetch failed: Invalid JSON response");
                setRecentScans([]);
                setStats({ total: 0, defects: 0, pending: 0 });
                setChartData([]);
                return;
            }

            const scans: any[] = Array.isArray(json.history) ? json.history : [];
            let totalDefects = 0;
            const defectCounts: Record<string, number> = {};

            scans.forEach((data: any) => {
                if (data.detections && Array.isArray(data.detections)) {
                    totalDefects += data.detections.length;
                    data.detections.forEach((det: any) => {
                        const cls = det.class || "Unknown";
                        defectCounts[cls] = (defectCounts[cls] || 0) + 1;
                    });
                }
            });

            setRecentScans(scans);

            setStats({
                total: scans.length,
                defects: totalDefects,
                pending: scans.filter(s => s.status === 'Pending').length
            });

            // Format chart data
            const chart = Object.keys(defectCounts).map(key => ({
                name: key,
                count: defectCounts[key],
                color: getColorForClass(key)
            }));
            setChartData(chart);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Listen for scan saved events to refresh data
        const handleScanSaved = () => {
            fetchData();
        };

        window.addEventListener('scanSaved', handleScanSaved);

        return () => {
            window.removeEventListener('scanSaved', handleScanSaved);
        };
    }, [user]);

    // Handle delete report
    const handleDelete = async (scan: any) => {
        if (!user || !scan?.id) return;

        const confirmed = window.confirm(`Are you sure you want to delete this report from ${scan.date}? This action cannot be undone.`);
        if (!confirmed) return;

        setDeleting(true);
        try {
            const token = await user.getIdToken();
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
            const res = await fetch(`${apiBase}/history/${scan.id}`, {
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
            setRecentScans(prev => prev.filter(s => s.id !== scan.id));
            setSelectedScan(null);

            // Refresh data
            fetchData();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete report');
        } finally {
            setDeleting(false);
        }
    };



    return (
        <div>
            <FadeIn>
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
                        <p className="text-muted-foreground mt-2">Welcome back_ {user?.displayName || user?.email || "to Swappers"}</p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 rounded-full hover:bg-secondary transition-colors"
                        title="Refresh Data"
                    >
                        <RotateCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </FadeIn>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                <SlideIn delay={0.1} className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Inspections</h3>
                    <p className="text-3xl font-bold mt-2">{loading ? "..." : stats.total}</p>
                    <div className="w-full bg-secondary h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: '100%' }} />
                    </div>
                </SlideIn>
                <SlideIn delay={0.2} className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">Defects Found</h3>
                    <p className="text-3xl font-bold mt-2 text-orange-500">{loading ? "..." : stats.defects}</p>
                    <div className="w-full bg-secondary h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full" style={{ width: `${stats.total ? (stats.defects / (stats.total * 5)) * 100 : 0}%` }} />
                    </div>
                </SlideIn>
                <SlideIn delay={0.3} className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">Pending Reports</h3>
                    <p className="text-3xl font-bold mt-2 text-yellow-500">{loading ? "..." : stats.pending}</p>
                    <div className="w-full bg-secondary h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full" style={{ width: `${stats.total ? (stats.pending / stats.total) * 100 : 0}%` }} />
                    </div>
                </SlideIn>
            </div>

            <FadeIn delay={0.4} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Defect Distribution Chart */}
                <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Defect Distribution</h3>
                        <span className="text-muted-foreground text-sm">Recent</span>
                    </div>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={80}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={<CustomTooltip />}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">No defects found yet</div>
                        )}
                    </div>
                </div>

                {/* Recent Inspections List */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Recent Inspections</h3>
                        <Link href="/en/dashboard/history" className="text-sm text-primary hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-secondary/50 border-b border-border">
                                <tr className="text-muted-foreground">
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Image</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Defect Types</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                                ) : recentScans.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No scans yet. Go to Upload or Camera to start.</td></tr>
                                ) : (
                                    recentScans.map((scan) => {
                                        const defectTypes: string[] = scan.detections && Array.isArray(scan.detections)
                                            ? [...new Set(scan.detections.map((d: any) => d.class || "Unknown"))] as string[]
                                            : [];
                                        return (
                                            <tr key={scan.id} className="hover:bg-secondary/20 group transition-colors">
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setSelectedScan(scan)}
                                                        className="w-16 h-10 bg-secondary rounded-lg overflow-hidden flex items-center justify-center relative group cursor-pointer"
                                                    >
                                                        {scan.image_url ? (
                                                            <>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={scan.image_url} alt="scan" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Eye className="w-4 h-4 text-white" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">No Img</span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {scan.date}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {defectTypes.length > 0 ? (
                                                            defectTypes.slice(0, 2).map((type: string, idx: number) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                                                                    style={{
                                                                        backgroundColor: `${getColorForClass(type)}20`,
                                                                        color: getColorForClass(type),
                                                                    }}
                                                                >
                                                                    {type}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">None</span>
                                                        )}
                                                        {defectTypes.length > 2 && (
                                                            <span className="text-xs text-muted-foreground">+{defectTypes.length - 2}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scan.status === 'Clean'
                                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                                        }`}>
                                                        {scan.status || "Completed"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => setSelectedScan(scan)}
                                                        className="text-primary hover:text-blue-400 font-medium text-xs uppercase tracking-wide"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </FadeIn>

            {/* Report Modal */}
            {selectedScan && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedScan(null)}>
                    <div
                        className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <div>
                                <h3 className="text-xl font-bold">Inspection Report</h3>
                                <p className="text-muted-foreground text-sm">{selectedScan.date}</p>
                            </div>
                            <button
                                onClick={() => setSelectedScan(null)}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Image Section */}
                                <div className="bg-black rounded-xl overflow-hidden relative group cursor-zoom-in" onClick={() => setFullScreenScan(selectedScan)}>
                                    {selectedScan.image_url ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={selectedScan.image_url}
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
                                        <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${selectedScan.status === 'Clean'
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                            : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                            }`}>
                                            {selectedScan.status}
                                        </span>
                                    </div>

                                    {/* Defects Found */}
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                            Defects Found ({selectedScan.defects || 0})
                                        </h4>
                                        {selectedScan.detections && selectedScan.detections.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedScan.detections.map((det: any, idx: number) => (
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
                                        <code className="text-xs bg-secondary px-2 py-1 rounded">{selectedScan.id}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {fullScreenScan && (
                <ImageViewer
                    src={fullScreenScan.image_url}
                    alt="Full Audit Image"
                    detections={fullScreenScan.detections || []}
                    onClose={() => setFullScreenScan(null)}
                />
            )}
        </div>
    )
}
