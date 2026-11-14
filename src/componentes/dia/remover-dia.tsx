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
} from "@/componentes/ui/alert-dialog";
import { getLocalDb, type CantinaLocalDb, type DiaDeVenda } from "@/local-db";
import { diaTemPedidos, ErroDeEscrita, removerDia } from "@/local-db/escritas";
import { useLeituraLocal } from "@/local-db/use-leitura-local";
import { rotuloDia } from "@/lib/formato";

/**
 * Link discreto "Remover dia", só enquanto o dia não tem pedidos. Depois de remover, o dia
 * sai de diasAtivos() e a tela volta para diaInicial().
 */
export function RemoverDia({ dia }: { dia: DiaDeVenda }) {
  const consulta = useCallback((db: CantinaLocalDb) => diaTemPedidos(db, dia.id), [dia.id]);
  const temPedidos = useLeituraLocal(consulta);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (temPedidos !== false) return null;

  async function remover() {
    try {
      await removerDia(getLocalDb(), dia.id);
      setAberto(false);
    } catch (e) {
      setErro(e instanceof ErroDeEscrita ? e.message : "Não foi possível remover o dia.");
    }
  }

  return (
    <AlertDialog
      open={aberto}
      onOpenChange={(sim) => {
        setAberto(sim);
        setErro(null);
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
          <AlertDialogTitle>Remover o dia {rotuloDia(dia.data)}?</AlertDialogTitle>
          <AlertDialogDescription>
            O dia sai da lista de dias. Para trocar a data, remova e crie de novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erro && (
          <p role="alert" className="text-[11px] text-warn">
            {erro}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void remover();
            }}
          >
            Remover dia
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
