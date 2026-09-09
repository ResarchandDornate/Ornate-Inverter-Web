"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isCustomer } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Chatbot from "@/components/Chatbot";

// Shared layout for every authenticated portal page.
export default function DashboardGroupLayout({ children }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else if (isCustomer()) {
      // Customers have no business on the fleet console — send them to their
      // own system. This is a UX guard, not a security boundary: the API is
      // what has to stop a customer's token from reading the whole fleet.
      router.replace("/my-system");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
      <Chatbot />
    </div>
  );
}
