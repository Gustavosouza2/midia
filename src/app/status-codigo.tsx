"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { lerCodigoEquipe } from "@/lib/codigo-equipe";

const semAssinatura = () => () => {};

export function StatusCodigo() {
  const temCodigo = useSyncExternalStore(
    semAssinatura,
    () => Boolean(lerCodigoEquipe()),
    () => null,
  );

  if (temCodigo === null) return null;

  return temCodigo ? (
    <p className="text-sm text-muted">
      Código da equipe salvo neste aparelho.{" "}
      <Link href="/codigo" className="font-semibold text-primary-text">
        Trocar
      </Link>
    </p>
  ) : (
    <Link
      href="/codigo"
      className="inline-flex h-12 w-fit items-center rounded-xl bg-primary px-5 font-semibold text-on-primary"
    >
      Digitar código da equipe
    </Link>
  );
}
