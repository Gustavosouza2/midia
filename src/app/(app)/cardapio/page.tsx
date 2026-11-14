import type { Metadata } from "next";
import { TransicaoDeTela } from "@/componentes/transicoes/transicao-de-tela";
import { Cardapio } from "@/componentes/cardapio/cardapio";

export const metadata: Metadata = { title: "Cardápio · Cantina da Mídia" };

export default function CardapioPage() {
  return (
    <TransicaoDeTela>
      <Cardapio />
    </TransicaoDeTela>
  );
}
