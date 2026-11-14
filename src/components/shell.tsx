"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { getLocalDb } from "@/local-db";
import { baixarCantina } from "@/local-db/download-canteen";
import { contarPendentes } from "@/local-db/count-pending";
import { useLeituraLocal } from "@/local-db/use-local-query";
import { IconeCardapio } from "./icons/menu-icon";
import { IconePainel } from "./icons/dashboard-icon";
import { IconePendentes } from "./icons/pending-icon";
import { IconeVendas } from "./icons/sales-icon";
import { Marca } from "./brand";

type ItemMenu = {
  href: string;
  rotulo: string;
  Icone: ComponentType<{ tamanho?: number }>;
};

const MENU: ItemMenu[] = [
  { href: "/", rotulo: "Painel", Icone: IconePainel },
  { href: "/vendas", rotulo: "Vendas", Icone: IconeVendas },
  { href: "/pendentes", rotulo: "Pendentes", Icone: IconePendentes },
  { href: "/cardapio", rotulo: "Cardápio", Icone: IconeCardapio },
];

/**
 * Moldura do app (DESIGN.md, "Componentes"):
 * - celular (até 560px): cabeçalho branco e barra de abas fixa embaixo;
 * - tablet (561–860px): menu numa barra no topo;
 * - desktop (861px+): menu lateral de 232px dentro de um painel branco com borda.
 */
export function Shell({ children }: { children: ReactNode }) {
  const caminho = usePathname();
  useEffect(() => {
    void baixarCantina(getLocalDb());
  }, []);
  const atual = MENU.find((item) => item.href === caminho) ?? MENU[0];
  const pendentes = useLeituraLocal(contarPendentes);

  return (
    <div className="flex min-h-dvh desk:p-4">
      <div className="flex min-w-0 flex-1 flex-col bg-page tablet:bg-background desk:flex-row desk:overflow-hidden desk:rounded-[14px] desk:border desk:border-border">
        {/* Celular: cabeçalho com o nome da tela */}
        <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-border bg-background px-4 pt-4 pb-3 tablet:hidden">
          <Marca />
          <div className="flex flex-col leading-[1.2]">
            <strong className="text-[15px] font-semibold">{atual.rotulo}</strong>
            <span className="text-[11px] text-muted-foreground">Cantina · Mídia</span>
          </div>
        </header>

        {/* Tablet e desktop: menu */}
        <nav
          aria-label="Menu principal"
          className="hidden flex-wrap items-center gap-2.5 border-b border-border px-4 py-3 tablet:flex desk:w-[232px] desk:flex-none desk:flex-col desk:flex-nowrap desk:items-stretch desk:gap-[18px] desk:border-r desk:border-b-0 desk:px-3.5 desk:py-[18px]"
        >
          <div className="flex items-center gap-2.5 px-1">
            <Marca />
            <div className="flex flex-col leading-[1.2]">
              <strong className="text-sm font-semibold">Cantina</strong>
              <span className="text-[11px] text-muted-foreground">Mídia · Casa do Pai</span>
            </div>
          </div>

          <div className="ml-auto flex gap-0.5 desk:ml-0 desk:flex-col">
            <span className="hidden px-2 pb-1.5 text-[11px] text-muted-foreground desk:block">Principal</span>
            {MENU.map((item) => {
              const ativo = item.href === atual.href;
              const contador = item.href === "/pendentes" && pendentes ? pendentes : null;
              return (
                <Link transitionTypes={["tela"]}
                  key={item.href}
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className="group flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 transition-colors duration-200 whitespace-nowrap text-text-2 hover:bg-accent aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                >
                  <item.Icone />
                  {item.rotulo}
                  {contador && (
                    <Badge
                      variant="secondary"
                      size="contador"
                      aria-label={`${contador} em aberto`}
                      className="ml-auto hidden min-w-[18px] desk:inline-flex group-aria-[current=page]:bg-white/15 group-aria-[current=page]:text-inherit"
                    >
                      {contador}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-auto hidden flex-col gap-0.5 rounded-[10px] border border-border bg-muted p-2.5 leading-[1.3] desk:flex">
            <strong className="text-xs font-semibold">Equipe de mídia</strong>
            <span className="text-[11px] text-muted-foreground">Casa do Pai</span>
          </div>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 pb-28 tablet:gap-[18px] tablet:pb-8 desk:gap-6 desk:px-7 desk:pt-4 desk:pb-10">
          {children}
        </main>

        {/* Celular: barra de abas fixa */}
        <nav
          aria-label="Menu"
          className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-border bg-background px-1.5 pt-1.5 pb-[calc(14px+env(safe-area-inset-bottom))] tablet:hidden"
        >
          {MENU.map((item) => {
            const conteudo = (ativo: boolean) => (
              <>
                <span
                  className={`flex h-7 w-11 items-center justify-center rounded-[9px] transition-colors duration-200 ${
                    ativo ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  <item.Icone tamanho={16} />
                </span>
                {item.rotulo}
              </>
            );
            const classes = "flex flex-col items-center gap-[3px] py-1 text-[10px] transition-colors duration-200";
            const ativo = item.href === atual.href;
            return (
              <Link transitionTypes={["tela"]}
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`${classes} ${ativo ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {conteudo(ativo)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
