"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import CustomerNav from "@/components/customer/CustomerNav";

// Shell for the customer-facing screens. Operators can open these too — it is
// how you demo the product to a prospect — so this only checks that someone is
// signed in. What a customer is allowed to SEE is enforced by the API, not here.
export default function CustomerGroupLayout({ children }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
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
    <div className="min-h-screen bg-slate-50">
      <CustomerNav />
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
