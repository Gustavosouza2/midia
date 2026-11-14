// Ícones dos protótipos (design/telas), com traço na cor do texto.
import type { ReactNode } from "react";

export function Icone({ tamanho = 15, traco = 2, children }: { tamanho?: number; traco?: number; children: ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
