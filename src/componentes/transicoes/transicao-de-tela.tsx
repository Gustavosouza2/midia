import { ViewTransition, type ReactNode } from "react";

/** Anima a entrada e a saída da tela quando a navegação vem do menu (Link com transitionTypes "tela"). */
export function TransicaoDeTela({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={{ tela: "tela", default: "none" }} exit={{ tela: "tela", default: "none" }} default="none">
      {children}
    </ViewTransition>
  );
}
