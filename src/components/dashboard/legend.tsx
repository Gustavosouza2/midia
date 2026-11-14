import { listrado } from "./striped";

export function Legenda() {
  return (
    <div className="flex gap-3.5 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2.5 rounded-xs bg-ok-fill" />
        Recebido
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2.5 rounded-xs" style={listrado} />
        Pendente
      </span>
    </div>
  );
}
