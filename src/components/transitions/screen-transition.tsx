import { ViewTransition, type ReactNode } from "react";

/** Animates the screen entering and leaving when navigation comes from the menu (Link with transitionTypes "screen"). */
export function ScreenTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={{ screen: "screen", default: "none" }} exit={{ screen: "screen", default: "none" }} default="none">
      {children}
    </ViewTransition>
  );
}
