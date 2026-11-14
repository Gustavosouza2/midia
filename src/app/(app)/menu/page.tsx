import type { Metadata } from "next";
import { ScreenTransition } from "@/components/transitions/screen-transition";
import { Menu } from "@/components/menu/menu";

export const metadata: Metadata = { title: "Cardápio · Cantina da Mídia" };

export default function MenuPage() {
  return (
    <ScreenTransition>
      <Menu />
    </ScreenTransition>
  );
}
