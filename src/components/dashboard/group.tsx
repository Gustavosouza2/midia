export function Group({ color, title, count }: { color: string; title: string; count: string }) {
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted px-3.5 py-2 tablet:px-5">
      <span className="inline-flex items-center gap-2 text-[11px] font-semibold">
        <i className={`size-2 rounded-full ${color}`} />
        {title}
      </span>
      <span className="text-[11px] text-muted-foreground">{count}</span>
    </div>
  );
}
