import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Sales without any registered item: before the sale day, the Menu. */
export function StartWithMenu() {
  return (
    <Card className="items-center gap-1 px-6 py-10 text-center">
      <h2 className="text-sm font-semibold">Cadastre os itens no Cardápio</h2>
      <p className="max-w-[420px] text-xs text-muted-foreground">
        Para vender, a cantina precisa saber o que vende. Cadastre os itens e crie o dia de venda no Cardápio.
      </p>
      <Button asChild className="mt-3">
        <Link transitionTypes={["screen"]} href="/menu">
          Ir para o Cardápio
        </Link>
      </Button>
    </Card>
  );
}
