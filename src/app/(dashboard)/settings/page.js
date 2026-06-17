"use client";

import { useState } from "react";
import { Settings as SettingsIcon, User, Bell, Shield } from "lucide-react";
import Topbar from "@/components/Topbar";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [section, setSection] = useState("profile");

  return (
    <>
      <Topbar title="Settings" breadcrumbs={["Dashboard", "Settings"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Inner side-nav */}
          <aside className="bg-white rounded-xl border border-slate-200 p-2 h-fit">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active
                      ? "bg-orange-50 text-orange-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  {s.label}
                </button>
              );
            })}
          </aside>

          {/* Content */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <SettingsIcon size={18} className="text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 capitalize">{section}</h2>
                <p className="text-xs text-slate-500">Configuration options for this section.</p>
              </div>
            </div>
            <p className="text-sm text-slate-500">Settings UI placeholder. Wire up to backend endpoints when ready.</p>
          </section>
        </div>
      </main>
    </>
  );
}
