import type { Metadata } from "next";
import { ScreenTransition } from "@/components/transitions/screen-transition";
import { Sales } from "@/components/sales/sales";

export const metadata: Metadata = { title: "Vendas · Cantina da Mídia" };

export default function SalesPage() {
  return (
    <ScreenTransition>
      <Sales />
    </ScreenTransition>
  );
}
