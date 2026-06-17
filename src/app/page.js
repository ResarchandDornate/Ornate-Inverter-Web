"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Always send fresh visitors to the login screen — the standard
// portal entry point. After login, /login pushes them to /dashboard.
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
    </div>
  );
}
