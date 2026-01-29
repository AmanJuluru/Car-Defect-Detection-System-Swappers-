"use client";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
    Home,
    LayoutDashboard,
    Upload,
    Camera,
    History,
    Settings,
    LogOut
} from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";

import { ThemeToggle } from "./theme-toggle";

function getLocaleFromParams(params: Record<string, string | string[] | undefined>) {
    const raw = params?.locale;
    return Array.isArray(raw) ? raw[0] : raw || "en";
}

const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const params = useParams();
    const locale = getLocaleFromParams(params as any);
    const { user } = useAuth();

    const base = `/${locale}`;

    const links = [
        { href: `${base}/`, label: "Home", icon: Home },
        { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { href: `${base}/dashboard/upload`, label: "Upload", icon: Upload },
        { href: `${base}/dashboard/camera`, label: "Camera", icon: Camera },
        { href: `${base}/dashboard/history`, label: "History", icon: History },
    ];

    const handleLogout = async () => {
        try {
            await logoutUser();
        } finally {
            // let any listeners refresh
            window.dispatchEvent(new CustomEvent("authChanged"));
            router.replace(`${base}/login`);
        }
    };

    return (
        <aside className="w-64 bg-card border-r border-border h-screen flex flex-col p-4 fixed left-0 top-0 overflow-y-auto">
            <div className="flex items-center gap-2 mb-10 px-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Camera className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Swappers
                </h1>
            </div>

            <nav className="flex-1 space-y-2">
                <p className="px-2 text-xs font-semibold text-muted-foreground mb-2 tracking-wider">
                    MAIN MENU
                </p>
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-blue-500/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border pt-4 mt-4 space-y-2">
                <p className="px-2 text-xs font-semibold text-muted-foreground mb-2 tracking-wider">
                    SYSTEM
                </p>
                {user?.email && (
                    <div className="px-3 py-2 text-xs text-muted-foreground truncate">
                        Signed in as <span className="text-foreground font-medium">{user.email}</span>
                    </div>
                )}
                <Link
                    href={`${base}/dashboard/profile`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                    <Settings className="w-5 h-5" />
                    Settings
                </Link>
                <ThemeToggle />
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
