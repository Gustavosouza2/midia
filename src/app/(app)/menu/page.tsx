import type { Metadata } from "next";
import { TransicaoDeTela } from "@/components/transitions/screen-transition";
import { Cardapio } from "@/components/menu/menu";

export const metadata: Metadata = { title: "Cardápio · Cantina da Mídia" };

export default function CardapioPage() {
  return (
    <TransicaoDeTela>
      <Cardapio />
    </TransicaoDeTela>
  );
}
