"use client";
import { User, Settings, Bell, Shield, Globe, Camera, Save, Building, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/useAuth";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";

export default function ProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch initial data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Initialize with auth data
                setName(user.displayName || "");
                setPreview(user.photoURL || null);

                // Fetch extended profile from backend
                const token = await user.getIdToken();
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace("localhost", "127.0.0.1");
                const res = await fetch(`${apiBase}/user/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.name) setName(data.name);
                    if (data.company) setCompany(data.company);
                    if (data.company_id) setCompanyId(data.company_id);
                    if (data.photo_url) setPreview(data.photo_url); // Prefer backend URL
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append("name", name);
            formData.append("company", company);
            formData.append("company_id", companyId);
            if (file) {
                formData.append("file", file);
            }

            const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace("localhost", "127.0.0.1");
            const res = await fetch(`${apiBase}/user/update`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Failed to update profile");
            }

            const checkData = await res.json();
            const newPhotoUrl = checkData.data?.photo_url;

            // Sync with Firebase Auth
            await updateProfile(user, {
                displayName: name,
                photoURL: newPhotoUrl || user.photoURL
            });

            // Force refresh to update sidebar/header
            window.location.reload();

            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Profile & Settings</h2>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Card / Avatar */}
                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
                        <div className="relative inline-block group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-secondary mx-auto shadow-xl">
                                {preview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-bold text-white">
                                        {name ? name.charAt(0).toUpperCase() : "U"}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-1 right-1 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-lg"
                                title="Change Photo"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold">{name || "Your Name"}</h3>
                            <p className="text-muted-foreground">{company || "No Company"}</p>
                        </div>

                        <div className="flex justify-center gap-2">
                            {companyId && <span className="px-3 py-1 bg-secondary rounded-full text-xs font-medium">ID: {companyId}</span>}
                        </div>
                    </div>
                </div>

                {/* Settings Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border bg-secondary/20">
                            <h3 className="font-semibold flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Personal Information
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full p-2.5 rounded-lg bg-secondary/50 border border-border focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        value={user?.email || ""}
                                        disabled
                                        className="w-full p-2.5 rounded-lg bg-secondary/20 border border-border text-muted-foreground cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border bg-secondary/20">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                Organization Details
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Company Name</label>
                                    <input
                                        type="text"
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="w-full p-2.5 rounded-lg bg-secondary/50 border border-border focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Company ID / License</label>
                                    <input
                                        type="text"
                                        value={companyId}
                                        onChange={(e) => setCompanyId(e.target.value)}
                                        className="w-full p-2.5 rounded-lg bg-secondary/50 border border-border focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="XYZ-12345"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
