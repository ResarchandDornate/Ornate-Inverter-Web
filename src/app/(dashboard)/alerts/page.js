"use client";

import { Bell } from "lucide-react";
import Topbar from "@/components/Topbar";

export default function AlertsPage() {
  return (
    <>
      <Topbar title="Alerts" breadcrumbs={["Dashboard", "Alerts"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Alert log — coming soon</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Fault transitions, offline events, and push-notification history will appear here once the backend pushes them.
          </p>
        </div>
      </main>
    </>
  );
}
