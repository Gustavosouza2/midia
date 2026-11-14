import { plural } from "@/lib/format";
import { OLD_PENDING_DAYS } from "@/lib/dashboard";

export function Age({ days }: { days: number }) {
  return (
    <span className={`text-[11px] ${days >= OLD_PENDING_DAYS ? "text-warn" : "text-muted-foreground"}`}>
      {days === 0 ? "hoje" : `há ${plural(days, "dia", "dias")}`}
    </span>
  );
}
