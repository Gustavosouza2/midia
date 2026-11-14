import type { Metadata } from "next";
import { TransicaoDeTela } from "@/components/transitions/screen-transition";
import { Painel } from "@/components/dashboard/dashboard";

export const metadata: Metadata = { title: "Painel · Cantina da Mídia" };

export default function PainelPage() {
  return (
    <TransicaoDeTela>
      <Painel />
    </TransicaoDeTela>
  );
}
