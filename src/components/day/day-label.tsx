import { Badge } from "@/components/ui/badge";
import type { SaleDay } from "@/local-db";
import { weekdayDate } from "@/lib/format";

/** "Dom, 15 nov", the "hoje" or "próximo" badge and the truncated day name: in the trigger and in the day list. */
export function DayLabel({ day, tag }: { day: SaleDay; tag: "hoje" | "próximo" | null }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="flex-none font-medium text-foreground tabular-nums">{weekdayDate(day.date)}</span>
      {tag && (
        <Badge variant={tag === "hoje" ? "ok" : "secondary"} className="h-[18px] px-1.5 text-[10px]">
          {tag}
        </Badge>
      )}
      {day.name && <span className="truncate text-muted-foreground">{day.name}</span>}
    </span>
  );
}
