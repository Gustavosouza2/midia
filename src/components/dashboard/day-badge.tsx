import { badgeDate } from "@/lib/format";

export function DayBadge({ date }: { date?: string }) {
  return (
    <span className="flex size-[38px] flex-none flex-col items-center justify-center rounded-[9px] bg-accent leading-[1.05] text-foreground tablet:size-10">
      {date ? (
        <>
          <strong className="text-sm font-bold">{badgeDate(date).day}</strong>
          <span className="text-[9px] tracking-[0.04em] uppercase">{badgeDate(date).month}</span>
        </>
      ) : (
        <strong className="text-sm font-bold">—</strong>
      )}
    </span>
  );
}
