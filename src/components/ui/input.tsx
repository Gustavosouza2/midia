import * as React from "react";
import { cn } from "cn";

// DESIGN.md input: `muted` background, `input` border. Phone 42px and 10px radius; tablet and desktop
// 34px and 8px radius. Focus with a `ring` outline, like the buttons.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[42px] w-full min-w-0 rounded-[10px] border border-input bg-muted px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground",
        "tablet:h-[34px] tablet:rounded-lg tablet:text-xs",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-warn",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
