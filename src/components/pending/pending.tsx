"use client";

import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { readLocalDb } from "@/local-db/read-local-db";
import { useLocalQuery } from "@/local-db/use-local-query";
import type { Period } from "@/lib/dashboard";
import { buildPending } from "@/lib/pending";
import { DayFilter } from "../day/day-filter";
import { PageHeader } from "../page-header";
import { SmoothSwap } from "../transitions/smooth-swap";
import { NoPending } from "./no-pending";
import { PendingPerson } from "./pending-person";
import { PendingSearch } from "./pending-search";
import { PendingStats } from "./pending-stats";

const TITLE = "Pendentes";
const SUBTITLE = "Quem comprou e ainda não pagou.";

export function Pending() {
  const data = useLocalQuery(readLocalDb);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  /** Order → payment received in this session. Gone when the screen reloads. */
  const [received, setReceived] = useState<ReadonlyMap<string, string>>(new Map());

  const pending = useMemo(
    () => data && buildPending(data, { period: selectedPeriod, search }, data.today, received),
    [data, selectedPeriod, search, received],
  );

  if (!data || !pending) {
    return (
      <>
        <PageHeader title={TITLE} subtitle={SUBTITLE} />
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  if (pending.days.length === 0) {
    return (
      <>
        <PageHeader title={TITLE} subtitle={SUBTITLE} />
        <NoPending title="Nenhum dia de venda ainda">
          <Button asChild variant="outline" className="h-11 tablet:h-[34px]">
            <Link transitionTypes={["screen"]} href="/">
              Criar o primeiro dia em Vendas
            </Link>
          </Button>
        </NoPending>
      </>
    );
  }

  const searching = search.trim() !== "";

  return (
    <>
      <PageHeader title={TITLE} subtitle={SUBTITLE}>
        <DayFilter
          days={pending.days}
          today={data.today}
          value={pending.period}
          onSelect={(period) => startTransition(() => setSelectedPeriod(period))}
          label="Dia de venda"
          all
        />
      </PageHeader>

      <SmoothSwap>
        <PendingStats stats={pending.stats} />
      </SmoothSwap>

      <PendingSearch value={search} onChange={setSearch} />

      <SmoothSwap>
        {pending.people.length === 0 ? (
          <NoPending title={searching ? "Ninguém encontrado" : "Nada pendente aqui"}>
            <span className="text-[11px] text-muted-foreground">
              {searching ? "Nenhum pendente com esse nome neste período." : "Todo mundo deste período já pagou."}
            </span>
          </NoPending>
        ) : (
          <Card role="region" aria-label="Quem deve">
            {pending.people.map((person) => (
              <PendingPerson
                key={person.key}
                person={person}
                onReceived={(orderId, paymentId) =>
                  setReceived((current) => new Map(current).set(orderId, paymentId))
                }
              />
            ))}
          </Card>
        )}
      </SmoothSwap>
    </>
  );
}
