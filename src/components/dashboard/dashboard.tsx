"use client";

import { startTransition, useMemo, useState } from "react";
import { DayFilter } from "@/components/day/day-filter";
import { readLocalDb } from "@/local-db/read-local-db";
import { useLocalQuery } from "@/local-db/use-local-query";
import { buildDashboard, type Period } from "@/lib/dashboard";
import { SmoothSwap } from "../transitions/smooth-swap";
import { Welcome } from "./welcome";
import { DashboardStats } from "./dashboard-stats";
import { NeedsAttention } from "./needs-attention";
import { SoldPerDay } from "./sold-per-day";

export function Dashboard() {
  const data = useLocalQuery(readLocalDb);
  const [period, setPeriod] = useState<Period>("all");
  const selectPeriod = (p: Period) => startTransition(() => setPeriod(p));
  const dashboard = useMemo(() => data && buildDashboard(data, period, data.today), [data, period]);

  if (!data || !dashboard) {
    return (
      <p className="text-[11px] text-muted-foreground" role="status">
        Carregando…
      </p>
    );
  }

  return (
    <SmoothSwap>
      <Welcome upcoming={dashboard.upcoming} reservations={dashboard.upcomingReservations} />

      <section className="flex flex-col gap-3">
        <DayFilter
          days={dashboard.days}
          today={data.today}
          value={period}
          onSelect={selectPeriod}
          label="Período"
          all
        />
        <DashboardStats stats={dashboard.stats} />
      </section>

      <section className="grid items-start gap-4 tablet:gap-5 wide:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <SoldPerDay days={dashboard.byDay} period={period} onSelect={selectPeriod} />
        <NeedsAttention
          reservations={dashboard.reservations}
          pending={dashboard.pending}
          pendingPeople={dashboard.stats.pendingPeople}
        />
      </section>
    </SmoothSwap>
  );
}
