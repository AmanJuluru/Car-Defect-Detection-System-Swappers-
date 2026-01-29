"use client";
import { useState } from "react";
import { registerUser } from "@/lib/auth";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Camera } from "lucide-react";

function getLocaleFromParams(params: Record<string, string | string[] | undefined>) {
    const raw = params?.locale;
    return Array.isArray(raw) ? raw[0] : raw || "en";
}

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const params = useParams();
    const locale = getLocaleFromParams(params as any);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await registerUser(email, password);
            router.push(`/${locale}/dashboard`);
        } catch (err: any) {
            setError(err.message || "Registration failed");
        }
    };

    return (
        <div className="bg-card border border-border p-8 rounded-xl shadow-2xl">
            <div className="text-center mb-8">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">Create Account</h1>
                <p className="text-muted-foreground text-sm">Join Swappers today</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5">Company Name</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="Acme Auto"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="name@company.com"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                >
                    Create Account
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href={`/${locale}/login`} className="text-primary hover:underline font-medium">
                    Sign In
                </Link>
            </p>
        </div>
    );
}
