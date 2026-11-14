"use client";

import * as React from "react";
import { cn } from "cn";
import { Toggle as TogglePrimitive } from "radix-ui";

// DESIGN.md segment: `muted-foreground` text; when on, `primary` background and white text.
const toggleClasses =
  "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[7px] px-3 text-xs whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 tablet:h-[30px] tablet:rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0";

function Toggle({ className, ...props }: React.ComponentProps<typeof TogglePrimitive.Root>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleClasses, className)} {...props} />;
}

export { Toggle, toggleClasses };
