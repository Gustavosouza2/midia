"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect, type ReactNode } from "react";

/** Registra o service worker e pede armazenamento persistente para o IndexedDB não ser apagado. */
export function Pwa({ children }: { children: ReactNode }) {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {
      // Alguns navegadores recusam sem perguntar; o app continua funcionando.
    });
  }, []);

  return <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>;
}
