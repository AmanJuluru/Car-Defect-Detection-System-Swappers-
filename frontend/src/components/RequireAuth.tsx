"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

function getLocaleFromParams(params: Record<string, string | string[] | undefined>) {
  const raw = params?.locale;
  return Array.isArray(raw) ? raw[0] : raw || "en";
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = getLocaleFromParams(params as any);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${locale}/login`);
    }
  }, [loading, user, router, locale]);

  if (loading) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

