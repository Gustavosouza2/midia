import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/lib/pending";

const PAID_WITH: Record<PaymentMethod, string> = { pix: "Pago via Pix", dinheiro: "Pago em dinheiro" };

/** Stays in place of the pay buttons after receiving, so the person does not vanish and the tap can be undone. */
export function PaidStatus({
  method,
  disabled,
  onUndo,
  className,
}: {
  /** null when several payments used different methods. */
  method: PaymentMethod | null;
  disabled: boolean;
  onUndo: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 animate-in duration-200 fade-in zoom-in-95", className)}>
      <span
        role="status"
        className="inline-flex h-10 flex-1 items-center justify-center rounded-[9px] bg-ok-soft px-3 text-[13px] font-medium whitespace-nowrap text-ok tablet:h-[30px] tablet:flex-none tablet:rounded-[7px] tablet:text-xs"
      >
        {method ? PAID_WITH[method] : "Pago"}
      </span>
      <Button
        variant="ghost"
        disabled={disabled}
        onClick={onUndo}
        className="h-10 px-3 text-text-2 underline underline-offset-3 tablet:h-[30px] tablet:px-2.5 tablet:text-muted-foreground"
      >
        Desfazer
      </Button>
    </div>
  );
}
