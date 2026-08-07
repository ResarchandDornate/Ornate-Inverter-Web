'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-fetches the server components on an interval so live MQTT data appears
 *  without a manual page reload. */
export function AutoRefresh({ seconds = 5 }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
