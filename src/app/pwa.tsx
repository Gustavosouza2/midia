"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect, type ReactNode } from "react";

// Em `next dev` o service worker serviria o HTML guardado de "/" e "/~offline", o hot reload
// acharia a página desatualizada e recarregaria sem parar. Ele só existe no build de produção.
const emDesenvolvimento = process.env.NODE_ENV === "development";

/** Registra o service worker e pede armazenamento persistente para o IndexedDB não ser apagado. */
export function Pwa({ children }: { children: ReactNode }) {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {
      // Alguns navegadores recusam sem perguntar; o app continua funcionando.
    });
    if (emDesenvolvimento) {
      void navigator.serviceWorker?.getRegistrations().then((registros) => registros.forEach((r) => r.unregister()));
    }
  }, []);

  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={emDesenvolvimento}>
      {children}
    </SerwistProvider>
  );
}
