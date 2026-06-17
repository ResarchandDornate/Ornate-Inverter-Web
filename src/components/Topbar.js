"use client";

import { useState } from "react";
import { Search, ChevronDown, User } from "lucide-react";

export default function Topbar({ title, breadcrumbs = [] }) {
  const [search, setSearch] = useState("");

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
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

        {/* Right: Search + Alerts + User */}
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

          <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">Operator</p>
              <p className="text-[10px] text-slate-500">Ornate Solar</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
