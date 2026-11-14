"use client";

import * as React from "react";
import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";

// DESIGN.md tabs (filter and view of the day's orders). Phone: horizontally scrolling chips.
// Tablet and desktop: segmented group with a `muted` background, active tab white with a shadow. The tabs only
// filter the screen, so there is usually no TabsContent.

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("min-w-0", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "-mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] tablet:mx-0 tablet:inline-flex tablet:max-w-full tablet:gap-0.5 tablet:rounded-[10px] tablet:border tablet:border-border tablet:bg-muted tablet:p-[3px]",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "h-8 flex-none rounded-full border border-input bg-background px-3.5 text-xs whitespace-nowrap text-text-2 transition-[color,background-color,border-color,box-shadow] duration-200 ease-out outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "tablet:h-[30px] tablet:rounded-[7px] tablet:border-0 tablet:bg-transparent tablet:px-3 tablet:text-muted-foreground",
        "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        "tablet:data-[state=active]:bg-background tablet:data-[state=active]:font-semibold tablet:data-[state=active]:text-foreground tablet:data-[state=active]:shadow-float",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
