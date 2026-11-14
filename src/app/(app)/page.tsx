import type { Metadata } from "next";
import { TransicaoDeTela } from "@/componentes/transicoes/transicao-de-tela";
import { Painel } from "@/componentes/painel/painel";

export const metadata: Metadata = { title: "Painel · Cantina da Mídia" };

export default function PainelPage() {
  return (
    <TransicaoDeTela>
      <Painel />
    </TransicaoDeTela>
  );
}
