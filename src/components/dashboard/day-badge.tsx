import { seloDia } from "@/lib/format";

export function SeloDoDia({ data }: { data?: string }) {
  return (
    <span className="flex size-[38px] flex-none flex-col items-center justify-center rounded-[9px] bg-accent leading-[1.05] text-foreground tablet:size-10">
      {data ? (
        <>
          <strong className="text-sm font-bold">{seloDia(data).dia}</strong>
          <span className="text-[9px] tracking-[0.04em] uppercase">{seloDia(data).mes}</span>
        </>
      ) : (
        <strong className="text-sm font-bold">—</strong>
      )}
    </span>
  );
}
