import Sidebar from "@/components/Sidebar";
import RequireAuth from "@/components/RequireAuth";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <Sidebar />
            <main className="flex-1 ml-64 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <RequireAuth>{children}</RequireAuth>
                </div>
            </main>
        </div>
    );
}
