import type { Metadata } from "next";
import { ScreenTransition } from "@/components/transitions/screen-transition";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = { title: "Painel · Cantina da Mídia" };

export default function DashboardPage() {
  return (
    <ScreenTransition>
      <Dashboard />
    </ScreenTransition>
  );
}
