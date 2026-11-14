import { useSyncExternalStore } from "react";

/** Same breakpoint as Tailwind's `tablet:` (globals.css). */
const TABLET = "(min-width: 35.0625rem)";

function subscribe(notify: () => void) {
  const query = window.matchMedia(TABLET);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/** Tablet and desktop open anchored popovers; the phone opens bottom sheets. */
export function useTablet(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(TABLET).matches,
    () => false,
  );
}
