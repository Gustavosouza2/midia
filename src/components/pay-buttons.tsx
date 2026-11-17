"use client";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/local-db/writes";

const METHODS: [PaymentMethod, string][] = [
  ["pix", "Pix"],
  ["dinheiro", "Dinheiro"],
];

/**
 * "Receber" in one tap: one button per method, side by side, so the method is the action itself.
 * `subject` names who pays, for screen readers ("Receber de Ana no Pix").
 */
export function PayButtons({
  subject,
  disabled,
  onPay,
  className,
  buttonClassName,
}: {
  subject: string;
  disabled?: boolean;
  onPay: (method: PaymentMethod) => void;
  className?: string;
  /** Size of the buttons where the default 30px is too small (phone rows). */
  buttonClassName?: string;
}) {
  return (
    <div role="group" aria-label={`Receber de ${subject}`} className={cn("flex items-center gap-1.5", className)}>
      {METHODS.map(([method, label]) => (
        <Button
          key={method}
          variant="outline"
          disabled={disabled}
          aria-label={`Receber de ${subject} ${method === "pix" ? "no Pix" : "em dinheiro"}`}
          onClick={() => onPay(method)}
          className={cn("h-[30px] px-3 font-medium", buttonClassName)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
