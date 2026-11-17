"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { getLocalDb } from "@/local-db";
import { downloadCanteen } from "@/local-db/download-canteen";
import { countPending } from "@/local-db/count-pending";
import { useLocalQuery } from "@/local-db/use-local-query";
import { MenuIcon } from "./icons/menu-icon";
import { DashboardIcon } from "./icons/dashboard-icon";
import { PendingIcon } from "./icons/pending-icon";
import { SalesIcon } from "./icons/sales-icon";
import { Brand } from "./brand";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
};

const MENU: NavItem[] = [
  { href: "/", label: "Vendas", Icon: SalesIcon },
  { href: "/pending", label: "Pendentes", Icon: PendingIcon },
  { href: "/menu", label: "Cardápio", Icon: MenuIcon },
  { href: "/dashboard", label: "Painel", Icon: DashboardIcon },
];

/**
 * App frame (DESIGN.md, "Components"):
 * - phone (up to 560px): white header and a tab bar fixed at the bottom;
 * - tablet (561–860px): menu in a bar at the top;
 * - desktop (861px+): 232px side menu inside a white bordered panel.
 */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    void downloadCanteen(getLocalDb());
  }, []);
  const current = MENU.find((item) => item.href === pathname) ?? MENU[0];
  const pending = useLocalQuery(countPending);

  return (
    <div className="flex min-h-dvh desk:p-4">
      <div className="flex min-w-0 flex-1 flex-col bg-page tablet:bg-background desk:flex-row desk:overflow-hidden desk:rounded-[14px] desk:border desk:border-border">
        {/* Phone: header with the screen name */}
        <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-border bg-background px-4 pt-4 pb-3 tablet:hidden">
          <Brand />
          <div className="flex flex-col leading-[1.2]">
            <strong className="text-[15px] font-semibold">{current.label}</strong>
            <span className="text-[11px] text-muted-foreground">Cantina · Mídia</span>
          </div>
        </header>

        {/* Tablet and desktop: menu */}
        <nav
          aria-label="Menu principal"
          className="hidden flex-wrap items-center gap-2.5 border-b border-border px-4 py-3 tablet:flex desk:w-[232px] desk:flex-none desk:flex-col desk:flex-nowrap desk:items-stretch desk:gap-[18px] desk:border-r desk:border-b-0 desk:px-3.5 desk:py-[18px]"
        >
          <div className="flex items-center gap-2.5 px-1">
            <Brand />
            <div className="flex flex-col leading-[1.2]">
              <strong className="text-sm font-semibold">Cantina</strong>
              <span className="text-[11px] text-muted-foreground">Mídia · Casa do Pai</span>
            </div>
          </div>

          <div className="ml-auto flex gap-0.5 desk:ml-0 desk:flex-col">
            <span className="hidden px-2 pb-1.5 text-[11px] text-muted-foreground desk:block">Principal</span>
            {MENU.map((item) => {
              const active = item.href === current.href;
              const badgeCount = item.href === "/pending" && pending ? pending : null;
              return (
                <Link transitionTypes={["screen"]}
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="group flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 transition-colors duration-200 whitespace-nowrap text-text-2 hover:bg-accent aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                >
                  <item.Icon />
                  {item.label}
                  {badgeCount && (
                    <Badge
                      variant="secondary"
                      size="counter"
                      aria-label={`${badgeCount} em aberto`}
                      className="ml-auto hidden min-w-[18px] desk:inline-flex group-aria-[current=page]:bg-white/15 group-aria-[current=page]:text-inherit"
                    >
                      {badgeCount}
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

        {/* Phone: fixed tab bar */}
        <nav
          aria-label="Menu"
          className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-border bg-background px-1.5 pt-1.5 pb-[calc(14px+env(safe-area-inset-bottom))] tablet:hidden"
        >
          {MENU.map((item) => {
            const badgeCount = item.href === "/pending" && pending ? pending : null;
            const content = (active: boolean) => (
              <>
                <span
                  className={`relative flex h-7 w-11 items-center justify-center rounded-[9px] transition-colors duration-200 ${
                    active ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  <item.Icon size={16} />
                  {badgeCount && (
                    <span
                      aria-label={`${badgeCount} em aberto`}
                      className="absolute -top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[9px] font-semibold text-white tabular-nums"
                    >
                      {badgeCount}
                    </span>
                  )}
                </span>
                {item.label}
              </>
            );
            const classes = "flex flex-col items-center gap-[3px] py-1 text-[10px] transition-colors duration-200";
            const active = item.href === current.href;
            return (
              <Link transitionTypes={["screen"]}
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${classes} ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {content(active)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
