"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { Loader2, Search, Filter, Camera, User as UserIcon, Building2, ArrowLeft, Trash2 } from "lucide-react";

// Define Types
type HistoryItem = {
    id: string;
    date: string; // YYYY-MM-DD
    createdAt: string; // ISO or Timestamp
    image_url: string;
    defects: number;
    status: string;
    detections: any[];
    user_id: string;
    user_email: string;
    company_id?: string;
};

const DEFECT_TYPES = ["All", "Dent", "Scratch", "Glass Broken", "Lamp Broken", "Tire Flat"];
const TIME_RANGES = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
];

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, defects: 0, activeUsers: 0 });

    // Filters
    const [defectFilter, setDefectFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("all");
    const [userFilter, setUserFilter] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login"); // Redirect to login if user is not authenticated
        } else if (!authLoading && user && user.role !== "admin") {
            router.push("/dashboard"); // Redirect non-admins
        }
    }, [user, authLoading, router]);

    // Only fetch history if user is authenticated AND admin
    useEffect(() => {
        if (!authLoading && user?.role === "admin") {
            fetchCompanyHistory();
        }
    }, [user, authLoading, defectFilter, dateFilter, userFilter]);

    // Calculate stats on history change
    useEffect(() => {
        calculateStats(history);
    }, [history]);

    const fetchCompanyHistory = async () => {
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            };

            // Build Query Params
            const params = new URLSearchParams();
            if (defectFilter !== "All") params.append("defect_type", defectFilter);
            if (userFilter) params.append("user_id", userFilter);

            // Date Logic
            const now = new Date();
            if (dateFilter === "today") {
                params.append("start_date", now.toISOString().split("T")[0]);
            } else if (dateFilter === "week") {
                const lastWeek = new Date(now.setDate(now.getDate() - 7));
                params.append("start_date", lastWeek.toISOString().split("T")[0]);
            } else if (dateFilter === "month") {
                const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
                params.append("start_date", lastMonth.toISOString().split("T")[0]);
            }

            const res = await fetch(`http://localhost:8000/api/v1/company/history?${params.toString()}`, {
                headers
            });

            if (res.ok) {
                const data = await res.json();
                setHistory(data.history || []);
            } else {
                console.error("Failed to fetch history");
            }
        } catch (error) {
            console.error("Error fetching company history:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (items: HistoryItem[]) => {
        const total = items.length;
        const defects = items.reduce((acc, item) => acc + (item.defects || 0), 0);
        const uniqueUsers = new Set(items.map(i => i.user_id)).size;
        setStats({ total, defects, activeUsers: uniqueUsers });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`http://localhost:8000/api/v1/history/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                // Remove from state
                setHistory(prev => prev.filter(item => item.id !== id));
                // Recalculate stats
                setStats(prev => ({
                    ...prev,
                    total: prev.total - 1
                }));
            } else {
                alert("Failed to delete report");
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("Error deleting report");
        }
    };

    if (authLoading || (user?.role !== "admin" && loading)) {
        return (
            <div className="flex items-center justify-center p-8 h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto pb-20">
            {/* Header with Back Button */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                            Company Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {user.company_id || "No Company Assigned"}
                        </p>
                    </div>
                    <button
                        onClick={fetchCompanyHistory}
                        className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium">Total Scans</h3>
                        <Camera className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">Filtered View</p>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium">Defects Detected</h3>
                        <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-bold text-red-500">{stats.defects}</div>
                        <p className="text-xs text-muted-foreground">Across all scans</p>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium">Active Employees</h3>
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-bold">{stats.activeUsers}</div>
                        <p className="text-xs text-muted-foreground">Contributors in this view</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-muted/30 p-4 rounded-lg border border-border">
                <div className="flex-1">
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Defect Type</label>
                    <select
                        value={defectFilter}
                        onChange={(e) => setDefectFilter(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {DEFECT_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Time Range</label>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {TIME_RANGES.map(range => (
                            <option key={range.value} value={range.value}>{range.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Employee ID (Exact)</label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder="Enter User ID..."
                            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h3 className="font-semibold text-lg">Company Activity Log</h3>
                </div>
                <div className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No scans found for the selected filters.
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Preview</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Employee</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Date</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Defects</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Status</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {history.map((item) => (
                                        <tr key={item.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted relative group cursor-pointer" onClick={() => window.open(item.image_url, '_blank')}>
                                                    <img
                                                        src={item.image_url}
                                                        alt="Scan"
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-xs">{item.user_email}</span>
                                                    <span className="text-[10px] text-muted-foreground">{item.user_id}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-muted-foreground">
                                                {item.date} <br />
                                                <span className="text-xs opacity-70">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ""}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                {item.defects > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.detections?.slice(0, 3).map((d: any, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs rounded-full border border-red-500/20">
                                                                {d.class || d.label}
                                                            </span>
                                                        ))}
                                                        {item.defects > 3 && (
                                                            <span className="text-xs text-muted-foreground">+{item.defects - 3} more</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-green-500 text-xs font-medium">Clean</span>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Approved' ? 'bg-green-500/10 text-green-500' :
                                                    item.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const token = await user?.getIdToken();
                                                                const res = await fetch(`http://localhost:8000/api/v1/report/${item.id}`, {
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                });
                                                                if (res.ok) {
                                                                    const blob = await res.blob();
                                                                    const url = window.URL.createObjectURL(blob);
                                                                    const a = document.createElement('a');
                                                                    a.href = url;
                                                                    a.download = `Report_${item.id}.pdf`;
                                                                    document.body.appendChild(a);
                                                                    a.click();
                                                                    window.URL.revokeObjectURL(url);
                                                                    document.body.removeChild(a);
                                                                } else {
                                                                    alert("Failed to download report");
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                                alert("Error downloading report");
                                                            }
                                                        }}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                        title="Download PDF Report"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                                        title="Delete Report"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
