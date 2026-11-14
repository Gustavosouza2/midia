import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/componentes/ui/button";
import { IconePainel } from "../icones/icone-painel";
import { Migalha } from "../migalha";

export function MigalhaDoPainel() {
  return (
    <Migalha Icone={IconePainel} titulo="Painel">
      <Button asChild>
        <Link transitionTypes={["tela"]} href="/vendas">
          <Plus className="size-3.5" />
          Nova venda
        </Link>
      </Button>
    </Migalha>
  );
}
