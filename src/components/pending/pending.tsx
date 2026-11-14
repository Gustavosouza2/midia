"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { readLocalDb } from "@/local-db/read-local-db";
import { useLocalQuery } from "@/local-db/use-local-query";
import type { Period } from "@/lib/dashboard";
import { buildPending } from "@/lib/pending";
import { PendingIcon } from "../icons/pending-icon";
import { Breadcrumb } from "../breadcrumb";
import { SmoothSwap } from "../transitions/smooth-swap";
import { PendingFilter } from "./pending-filter";
import { PendingGroup } from "./pending-group";
import { PendingStats } from "./pending-stats";
import { NoPending } from "./no-pending";

/**
 * On the phone, the order is tabs → stats → search → groups (Mobile-Pending prototype);
 * on tablet and desktop, tabs and search share a row above the stats. The filter
 * row becomes `contents` on the phone and the `order-*` classes arrange the pieces.
 */
export function Pending() {
  const data = useLocalQuery(readLocalDb);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  /** Order → payment received in this session. Gone when the screen reloads. */
  const [received, setReceived] = useState<ReadonlyMap<string, string>>(new Map());
  const [choosing, setChoosing] = useState<string | null>(null);

  const pending = useMemo(
    () => data && buildPending(data, { period: selectedPeriod, search }, data.today, received),
    [data, selectedPeriod, search, received],
  );

  const breadcrumb = (
    <Breadcrumb Icon={PendingIcon} title="Pendentes">
      <Button asChild>
        <Link transitionTypes={["screen"]} href="/sales">
          <Plus className="size-3.5" />
          Nova venda
        </Link>
      </Button>
    </Breadcrumb>
  );

  if (!data || !pending) {
    return (
      <>
        {breadcrumb}
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  const noDays = pending.days.length === 0;

  return (
    <>
      {breadcrumb}
      <section className="flex flex-col gap-1">
        <h1 className="text-lg leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Pendentes</h1>
        <p className="text-xs text-muted-foreground">
          Quem comprou e ainda não pagou. Ao receber, escolha Pix ou dinheiro.
        </p>
      </section>

      {!noDays && (
        <PendingFilter
          days={pending.days}
          today={data.today}
          period={pending.period}
          onSelect={(period) =>
            startTransition(() => {
              setSelectedPeriod(period);
              setChoosing(null);
            })
          }
          search={search}
          onSearch={setSearch}
        />
      )}

      <SmoothSwap>
        <PendingStats stats={pending.stats} />

        <div className="order-4 flex flex-col gap-4 tablet:gap-5">
          {noDays ? (
            <NoPending title="Nenhum dia de venda ainda">
              <Button asChild variant="outline">
                <Link transitionTypes={["screen"]} href="/sales">
                  Criar o primeiro dia em Vendas
                </Link>
              </Button>
            </NoPending>
          ) : pending.groups.length === 0 ? (
            <NoPending title={search.trim() ? "Ninguém encontrado" : "Nada pendente aqui"}>
              <span className="text-[11px] text-muted-foreground">
                {search.trim() ? "Nenhum pendente com esse nome neste período." : "Todo mundo deste período já pagou."}
              </span>
            </NoPending>
          ) : (
            pending.groups.map((group) => (
              <PendingGroup
                key={group.key}
                group={group}
                choosing={choosing}
                onSelect={setChoosing}
                onReceive={(orderId, paymentId) => {
                  setReceived((current) => new Map(current).set(orderId, paymentId));
                  setChoosing(null);
                }}
              />
            ))
          )}
        </div>
      </SmoothSwap>
    </>
  );
}
