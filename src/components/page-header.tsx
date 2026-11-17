import type { ReactNode } from "react";

/** Page title with an optional line below and the screen's controls on the right (day filter, main action). */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between desk:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {/* The phone header already names the screen: there the title stays only for screen readers. */}
        <h1 className="max-tablet:sr-only text-xl leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">{title}</h1>
        {subtitle && (
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {children && <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
