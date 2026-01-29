"use client";
import { useState } from "react";
import { loginUser, loginWithGoogle } from "@/lib/auth";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Camera } from "lucide-react";

function getLocaleFromParams(params: Record<string, string | string[] | undefined>) {
    const raw = params?.locale;
    return Array.isArray(raw) ? raw[0] : raw || "en";
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const params = useParams();
    const locale = getLocaleFromParams(params as any);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await loginUser(email, password);
            router.push(`/${locale}/dashboard`);
        } catch (err: any) {
            setError("Invalid email or password");
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            router.push(`/${locale}/dashboard`);
        } catch (err) {
            setError("Google login failed");
        }
    }

    return (
        <div className="bg-card border border-border p-8 rounded-xl shadow-2xl">
            <div className="text-center mb-8">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-muted-foreground text-sm">Sign in to your account</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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
                    Sign In
                </button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
            </div>

            <button
                onClick={handleGoogleLogin}
                type="button"
                className="w-full py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
            </button>

            <p className="mt-8 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href={`/${locale}/register`} className="text-primary hover:underline font-medium">
                    Sign up
                </Link>
            </p>
        </div>
    );
}
