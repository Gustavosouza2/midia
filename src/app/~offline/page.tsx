import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sem conexão · Cantina da Mídia" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-2 px-4">
      <h1 className="text-[26px] font-semibold">Sem conexão</h1>
      <p className="text-muted">
        Esta página ainda não foi aberta neste aparelho. Conecte-se à internet e tente de novo.
      </p>
    </main>
  );
}
