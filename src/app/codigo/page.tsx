import type { Metadata } from "next";
import { FormCodigo } from "./form-codigo";

export const metadata: Metadata = { title: "Código da equipe · Cantina da Mídia" };

export default function CodigoPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:115%]">Código da equipe</h1>
        <p className="text-sm text-muted">
          Digite o código uma vez. Ele fica salvo neste aparelho.
        </p>
      </div>
      <FormCodigo />
    </main>
  );
}
