import type { Metadata } from "next";
import { TransicaoDeTela } from "@/components/transitions/screen-transition";
import { Pendentes } from "@/components/pending/pending";

export const metadata: Metadata = { title: "Pendentes · Cantina da Mídia" };

export default function PendentesPage() {
  return (
    <TransicaoDeTela>
      <Pendentes />
    </TransicaoDeTela>
  );
}
