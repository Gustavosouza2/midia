"use client";

import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getLocalDb, type CanteenLocalDb, type SaleDay } from "@/local-db";
import { dayHasOrders, WriteError, removeDay } from "@/local-db/writes";
import { useLocalQuery } from "@/local-db/use-local-query";
import { shortDate } from "@/lib/format";

/**
 * Discreet "Remover dia" link, only while the day has no orders. After removal, the day
 * leaves activeDays() and the screen goes back to initialDay().
 */
export function RemoveDay({ day }: { day: SaleDay }) {
  const query = useCallback((db: CanteenLocalDb) => dayHasOrders(db, day.id), [day.id]);
  const hasOrders = useLocalQuery(query);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasOrders !== false) return null;

  async function remove() {
    try {
      await removeDay(getLocalDb(), day.id);
      setOpen(false);
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível remover o dia.");
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-[11px] text-muted-foreground underline-offset-2 hover:text-warn hover:underline"
        >
          Remover dia
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover o dia {shortDate(day.date)}?</AlertDialogTitle>
          <AlertDialogDescription>
            O dia sai da lista de dias. Para trocar a data, remova e crie de novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-[11px] text-warn">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void remove();
            }}
          >
            Remover dia
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
