import { useSyncExternalStore } from "react";

/** Mesmo ponto de quebra do `tablet:` do Tailwind (globals.css). */
const TABLET = "(min-width: 35.0625rem)";

function assinar(avisar: () => void) {
  const consulta = window.matchMedia(TABLET);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/** Tablet e desktop abrem popovers ancorados; o celular abre folhas de baixo para cima. */
export function useTablet(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(TABLET).matches,
    () => false,
  );
}
