"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, User, LogOut, Settings as SettingsIcon, Bell, AlertTriangle, WifiOff } from "lucide-react";
import { clearToken } from "@/lib/auth";
import { showSuccess } from "@/lib/toast";

export default function Topbar({ title, breadcrumbs = [] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: "site-offline", title: "Installation is offline", detail: "Okhla Installation has not reported for 12 minutes.", time: "12 min ago", level: "critical", unread: true },
    { id: "low-output", title: "Solar output below expected", detail: "Solar Monitoring Site is producing below its expected range.", time: "38 min ago", level: "warning", unread: true },
  ]);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setNotificationOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = () => {
    setMenuOpen(false);
    clearToken();
    showSuccess("Signed out");
    router.replace("/login");
  };

  const handleProfile = () => {
    setMenuOpen(false);
    router.push("/settings");
  };

  const openNotifications = () => {
    setNotificationOpen((open) => !open);
  };

  const markAllRead = () => setNotifications((current) => current.map((notification) => ({ ...notification, unread: false })));

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Title + breadcrumbs */}
        <div className="min-w-0">
          {breadcrumbs.length > 0 && (
            <nav className="text-xs text-slate-500 flex items-center gap-1.5 mb-0.5">
              {breadcrumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-300">/</span>}
                  <span className={i === breadcrumbs.length - 1 ? "text-slate-700 font-medium" : ""}>
                    {c}
                  </span>
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-lg font-bold text-slate-900 truncate">{title}</h1>
        </div>

        {/* Right: Search + User */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center bg-slate-100 rounded-lg px-3 py-2 w-72">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inverters, alerts..."
              className="bg-transparent outline-none text-sm ml-2 flex-1 placeholder:text-slate-400"
            />
            <kbd className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              /
            </kbd>
          </div>

          {/* Site-health notifications — backend will replace preview items. */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={openNotifications}
              aria-expanded={notificationOpen}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              className={`relative rounded-lg p-2 transition ${notificationOpen ? "bg-slate-100" : "hover:bg-slate-100"}`}
            >
              <Bell size={19} className="text-slate-500" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 z-[60] mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div><p className="text-sm font-semibold text-slate-900">Site notifications</p><p className="text-[11px] text-slate-500">Crashes, communication losses, and alerts</p></div>
                  {unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-medium text-orange-600 hover:underline">Mark all read</button>}
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} onRead={() => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, unread: false } : item))} />)}
                </div>
                <button onClick={() => { setNotificationOpen(false); router.push("/data-logger/alerts"); }} className="w-full border-t border-slate-100 px-4 py-3 text-left text-xs font-semibold text-orange-600 hover:bg-orange-50">View all alerts</button>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg transition ${
                menuOpen ? "bg-slate-100" : "hover:bg-slate-100"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-tight">Operator</p>
                <p className="text-[10px] text-slate-500">Ornate Solar</p>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">Operator</p>
                  <p className="text-xs text-slate-500">Ornate Solar</p>
                </div>
                <button
                  onClick={handleProfile}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700"
                >
                  <SettingsIcon size={15} className="text-slate-400" />
                  Account Settings
                </button>
                <div className="border-t border-slate-100" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 font-medium"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationRow({ notification, onRead }) {
  const Icon = notification.level === "critical" ? WifiOff : AlertTriangle;
  const tone = notification.level === "critical" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600";
  return (
    <button onClick={onRead} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${notification.unread ? "bg-orange-50/40" : ""}`}>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={15} /></span>
      <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{notification.title}</span>{notification.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />}</span><span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{notification.detail}</span><span className="mt-1 block text-[11px] text-slate-400">{notification.time}</span></span>
    </button>
  );
}
