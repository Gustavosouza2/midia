import type { Metadata } from "next";
import { TransicaoDeTela } from "@/componentes/transicoes/transicao-de-tela";
import { Vendas } from "@/componentes/vendas/vendas";

export const metadata: Metadata = { title: "Vendas · Cantina da Mídia" };

export default function VendasPage() {
  return (
    <TransicaoDeTela>
      <Vendas />
    </TransicaoDeTela>
  );
}
