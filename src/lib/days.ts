import type { DiaDeVenda } from "@/local-db";
import { mesPorExtenso } from "./format";

/** Regras do filtro de dia (DESIGN.md, "Dias de venda"). Datas sempre "AAAA-MM-DD". */

/** Dias não removidos, do mais novo para o mais antigo: a ordem da lista de dias. */
export function diasAtivos(dias: DiaDeVenda[]): DiaDeVenda[] {
  return dias.filter((d) => !d.canceladoEm).sort((a, b) => b.data.localeCompare(a.data));
}

/** O primeiro dia com data de hoje ou depois. `dias` em ordem de diasAtivos(). */
export function proximoDia(dias: DiaDeVenda[], hoje: string): DiaDeVenda | null {
  return dias.findLast((d) => d.data >= hoje) ?? null;
}

/** Dia aberto ao entrar na tela: hoje, senão o próximo dia, senão o mais recente. */
export function diaInicial(dias: DiaDeVenda[], hoje: string): DiaDeVenda | null {
  return proximoDia(dias, hoje) ?? dias[0] ?? null;
}

/** Selo ao lado da data: "hoje" no dia de hoje, "próximo" no próximo dia quando ele ainda não chegou. */
export function marcaDoDia(dia: DiaDeVenda, dias: DiaDeVenda[], hoje: string): "hoje" | "próximo" | null {
  if (dia.data === hoje) return "hoje";
  return dia.id === proximoDia(dias, hoje)?.id ? "próximo" : null;
}

/** Os dias das setas ‹ e ›: o anterior (mais antigo) e o seguinte (mais novo). `dias` em ordem de diasAtivos(). */
export function vizinhos(dias: DiaDeVenda[], diaId: string): { anterior: DiaDeVenda | null; seguinte: DiaDeVenda | null } {
  const i = dias.findIndex((d) => d.id === diaId);
  if (i === -1) return { anterior: null, seguinte: null };
  return { anterior: dias[i + 1] ?? null, seguinte: dias[i - 1] ?? null };
}

/** Data sugerida para um dia novo: o próximo domingo sem dia (hoje, se for domingo e estiver livre). */
export function dataDoNovoDia(dias: DiaDeVenda[], hoje: string): string {
  const ocupadas = new Set(dias.map((d) => d.data));
  const [ano, mes, dia] = hoje.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + ((7 - data.getUTCDay()) % 7));
  while (ocupadas.has(data.toISOString().slice(0, 10))) data.setUTCDate(data.getUTCDate() + 7);
  return data.toISOString().slice(0, 10);
}

/** [["Novembro de 2026", [...]], ["Outubro de 2026", [...]]], mantendo a ordem dos dias. */
export function agruparPorMes(dias: DiaDeVenda[]): [string, DiaDeVenda[]][] {
  const grupos = new Map<string, DiaDeVenda[]>();
  for (const dia of dias) {
    const mes = mesPorExtenso(dia.data);
    grupos.set(mes, [...(grupos.get(mes) ?? []), dia]);
  }
  return [...grupos];
}
