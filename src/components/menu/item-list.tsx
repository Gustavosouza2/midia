import type { DiaDeVenda } from "@/local-db";
import type { Cardapio } from "@/lib/menu";
import { diaPorExtenso } from "@/lib/format";
import { RemoverDia } from "../day/remove-day";
import { COLUNAS } from "./columns";
import { LinhaDoItem } from "./item-row";

/** Até 1180px: um cartão por item (dois por linha a partir do tablet). Acima: uma tabela dentro de um card. */
export function ListaDeItens({ dia, cardapio }: { dia: DiaDeVenda; cardapio: Cardapio }) {
  const extenso = diaPorExtenso(dia.data);
  const total = cardapio.itens.length;

  return (
    <section
      aria-label="Itens do cardápio"
      className="flex flex-col gap-2.5 wide:gap-0 wide:overflow-hidden wide:rounded-xl wide:border wide:border-border wide:bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1 wide:px-5 wide:py-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <h2 className="text-sm font-semibold">
              Itens em {extenso[0].toLowerCase()}
              {extenso.slice(1)}
            </h2>
            <RemoverDia dia={dia} />
          </div>
          <span className="text-[11px] text-muted-foreground">
            Mudar um preço vale para as próximas vendas deste dia. Vendas já feitas mantêm o preço delas.
            Quantidade vazia é sem limite; vendas e reservas descontam dela.
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {cardapio.aVenda} de {total} {total === 1 ? "item" : "itens"} à venda
        </span>
      </div>

      {total === 0 ? (
        <p className="rounded-xl border border-border bg-card px-3.5 py-4 text-[11px] text-muted-foreground wide:rounded-none wide:border-x-0 wide:border-b-0 wide:px-5">
          Nenhum item no cardápio ainda. Use “Adicionar item” para cadastrar o primeiro.
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`hidden gap-4 bg-muted px-5 py-2.5 text-[11px] text-muted-foreground wide:grid ${COLUNAS}`}
          >
            <span>Item</span>
            <span>Preço neste dia</span>
            <span>Quantidade</span>
            <span>Vendidos</span>
            <span>No cardápio do dia</span>
          </div>
          <ul className="flex flex-col gap-2.5 tablet:grid tablet:grid-cols-2 tablet:items-start wide:flex wide:items-stretch wide:gap-0">
            {cardapio.itens.map((item) => (
              <LinhaDoItem key={item.produto.id} diaId={dia.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
