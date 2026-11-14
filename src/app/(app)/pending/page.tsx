import type { Metadata } from "next";
import { ScreenTransition } from "@/components/transitions/screen-transition";
import { Pending } from "@/components/pending/pending";

export const metadata: Metadata = { title: "Pendentes · Cantina da Mídia" };

export default function PendingPage() {
  return (
    <ScreenTransition>
      <Pending />
    </ScreenTransition>
  );
}
