"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect, type ReactNode } from "react";

// In `next dev` the service worker would serve the cached HTML of "/" and "/~offline", hot reload
// would find the page stale and reload forever. It only exists in the production build.
const isDevelopment = process.env.NODE_ENV === "development";

/** Registers the service worker and asks for persistent storage so IndexedDB is not evicted. */
export function Pwa({ children }: { children: ReactNode }) {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {
      // Some browsers refuse without asking; the app keeps working.
    });
    if (isDevelopment) {
      void navigator.serviceWorker?.getRegistrations().then((records) => records.forEach((r) => r.unregister()));
    }
  }, []);

  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={isDevelopment}>
      {children}
    </SerwistProvider>
  );
}
