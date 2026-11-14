import type { Metadata } from "next";
import { TransicaoDeTela } from "@/componentes/transicoes/transicao-de-tela";
import { Pendentes } from "@/componentes/pendentes/pendentes";

export const metadata: Metadata = { title: "Pendentes · Cantina da Mídia" };

export default function PendentesPage() {
  return (
    <TransicaoDeTela>
      <Pendentes />
    </TransicaoDeTela>
  );
}
