import type { ReactNode } from "react";

const TONES = { warn: "text-warn" } as const;

export function Stat({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  /** Value in orange, like Pendente. */
  tone?: "warn";
  /** Detail below the value, aligned to the bottom of the column. */
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-background p-3.5 tablet:px-5 tablet:py-[18px]">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <strong
        className={`text-lg leading-[1.15] font-semibold tracking-[-0.02em] tablet:text-2xl ${tone ? TONES[tone] : ""}`}
      >
        {value}
      </strong>
      <div className="mt-auto flex flex-col gap-1.5 text-[11px] text-muted-foreground">{children}</div>
    </div>
  );
}
