import { ViewTransition, type ReactNode } from "react";

/**
 * Cruza o conteúdo velho com o novo quando ele muda dentro de um startTransition
 * (trocar de dia ou de período). Mudanças comuns de estado não animam.
 */
export function TrocaSuave({ children }: { children: ReactNode }) {
  return (
    <ViewTransition update="troca" default="none">
      {children}
    </ViewTransition>
  );
}
