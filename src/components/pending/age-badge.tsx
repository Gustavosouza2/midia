import { cn } from "cn";
import { OLD_PENDING_DAYS } from "@/lib/dashboard";
import { plural } from "@/lib/format";

/** "há 17 dias" in orange once it passes 2 weeks, so whoever owes longest stands out. */
export function AgeBadge({ ageDays, muted }: { ageDays: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-[7px] py-0.5 text-[11px] whitespace-nowrap",
        muted
          ? "bg-accent text-muted-foreground"
          : ageDays >= OLD_PENDING_DAYS
            ? "bg-warn-soft text-warn"
            : "bg-accent text-text-2",
      )}
    >
      {ageDays === 0 ? "hoje" : `há ${plural(ageDays, "dia", "dias")}`}
    </span>
  );
}
