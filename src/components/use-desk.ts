import { useSyncExternalStore } from "react";

/** Same breakpoint as Tailwind's `desk:` (globals.css). */
const DESK = "(min-width: 53.8125rem)";

function subscribe(notify: () => void) {
  const query = window.matchMedia(DESK);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/** Desktop has room for the order panel beside the items; smaller screens open it in a sheet. */
export function useDesk(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESK).matches,
    () => false,
  );
}
