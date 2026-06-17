"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { clearToken } from "@/lib/auth";
import { showSuccess } from "@/lib/toast";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inverters", label: "Inverters", icon: Zap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    showSuccess("Signed out");
    router.replace("/login");
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 text-slate-300 flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt="Ornate Solar"
          className="h-9 w-auto object-contain shrink-0"
        />
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">Ornate Solar</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Inverter Monitor
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-3 mb-2">
          Workspace
        </p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500"
                      : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
        <p className="text-[10px] text-slate-500 text-center mt-3">
          v1.0 · © Ornate Solar
        </p>
      </div>
    </aside>
  );
}
