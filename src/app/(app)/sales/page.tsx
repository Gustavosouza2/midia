import type { Metadata } from "next";
import { TransicaoDeTela } from "@/components/transitions/screen-transition";
import { Vendas } from "@/components/sales/sales";

export const metadata: Metadata = { title: "Vendas · Cantina da Mídia" };

export default function VendasPage() {
  return (
    <TransicaoDeTela>
      <Vendas />
    </TransicaoDeTela>
  );
}
