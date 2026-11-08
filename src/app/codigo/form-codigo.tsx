"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { fetchApi, salvarCodigoEquipe } from "@/lib/codigo-equipe";

type Estado = { tipo: "parado" } | { tipo: "conferindo" } | { tipo: "erro"; mensagem: string };

export function FormCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valor = codigo.trim();
    if (!valor) return;

    setEstado({ tipo: "conferindo" });
    try {
      const resposta = await fetchApi("/api/produtos", {}, valor);
      if (resposta.status === 401) {
        setEstado({ tipo: "erro", mensagem: "Código incorreto. Confira com o responsável pela cantina." });
        return;
      }
      if (!resposta.ok) {
        setEstado({ tipo: "erro", mensagem: "Não deu para conferir agora. Tente de novo em instantes." });
        return;
      }
    } catch {
      setEstado({ tipo: "erro", mensagem: "Sem conexão. Conecte-se à internet para salvar o código pela primeira vez." });
      return;
    }

    salvarCodigoEquipe(valor);
    router.push("/");
  }

  const conferindo = estado.tipo === "conferindo";

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="codigo" className="text-sm font-medium text-text-2">
          Código
        </label>
        <input
          id="codigo"
          name="codigo"
          type="password"
          autoComplete="off"
          autoCapitalize="none"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="h-12 rounded-xl border border-line-strong bg-field px-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      {estado.tipo === "erro" && (
        <p role="alert" className="text-sm text-primary-text">
          {estado.mensagem}
        </p>
      )}
      <button
        type="submit"
        disabled={conferindo || !codigo.trim()}
        className="h-12 rounded-xl bg-primary font-semibold text-on-primary disabled:opacity-50"
      >
        {conferindo ? "Conferindo…" : "Salvar código"}
      </button>
    </form>
  );
}
