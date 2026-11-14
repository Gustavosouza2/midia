import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconePainel } from "../icons/dashboard-icon";
import { Migalha } from "../breadcrumb";

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
