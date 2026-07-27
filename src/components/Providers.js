"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export default function Providers({ children }) {
  // Lazy-init so SSR + client share a single instance per page-load.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            // Re-sync the instant a backgrounded tab/window regains focus —
            // without this, a page left open while you're elsewhere can fall
            // behind (browsers throttle timers in background tabs), making
            // the same inverter show different values on different pages.
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
