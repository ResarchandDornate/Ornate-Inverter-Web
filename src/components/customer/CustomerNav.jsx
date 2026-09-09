"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sun } from "lucide-react";
import { clearToken, getProfile } from "@/lib/auth";
import { showSuccess } from "@/lib/toast";

// Customer-facing chrome. Deliberately lighter than the operator sidebar —
// someone who bought one system doesn't need a fleet console, and this is the
// surface that gets sold alongside the hardware.
export default function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = typeof window !== "undefined" ? getProfile() : null;

  const onDetail = /^\/my-system\/[^/]+$/.test(pathname);

  const handleLogout = () => {
    clearToken();
    showSuccess("Signed out");
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center gap-4">
        <Link href="/my-system" className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Ornate Solar" className="h-8 w-auto object-contain" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900 leading-tight">
              My Solar System
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-slate-400">
              Powered by Ornate Solar
            </span>
          </span>
        </Link>

        {onDetail && (
          <Link
            href="/my-system"
            className="hidden sm:inline text-xs font-semibold text-orange-600 hover:underline"
          >
            ← All inverters
          </Link>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Sun size={14} className="text-amber-500" />
            {profile?.name || profile?.email || "My account"}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
