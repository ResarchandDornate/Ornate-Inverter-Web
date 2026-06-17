"use client";

import { BarChart3 } from "lucide-react";
import Topbar from "@/components/Topbar";

export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="Analytics" breadcrumbs={["Dashboard", "Analytics"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-orange-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Analytics — coming soon</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Daily, weekly, monthly, and yearly aggregate analytics will live here. Ported from the mobile app on request.
          </p>
        </div>
      </main>
    </>
  );
}
