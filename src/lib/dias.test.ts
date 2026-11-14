import { describe, expect, it } from "vitest";
import type { DiaDeVenda } from "@/local-db";
import { agruparPorMes, dataDoNovoDia, diaInicial, diasAtivos, marcaDoDia, vizinhos } from "./dias";

function dia(data: string, canceladoEm: string | null = null): DiaDeVenda {
  return {
    id: data,
    cantinaId: "c",
    data,
    nome: null,
    fechadoEm: null,
    canceladoEm,
    atualizadoEm: "2026-11-01T00:00:00.000Z",
    seq: 1,
  };
}

const ids = (dias: (DiaDeVenda | null)[]) => dias.map((d) => d?.data ?? null);

describe("diasAtivos", () => {
  it("tira os removidos e ordena do mais novo para o mais antigo", () => {
    const dias = [dia("2026-10-18"), dia("2026-11-15"), dia("2026-11-08", "2026-11-02T10:00:00Z"), dia("2026-11-01")];
    expect(ids(diasAtivos(dias))).toEqual(["2026-11-15", "2026-11-01", "2026-10-18"]);
  });
});

describe("diaInicial", () => {
  const dias = diasAtivos([dia("2026-11-01"), dia("2026-11-15"), dia("2026-11-22"), dia("2026-11-08")]);

  it("abre hoje quando hoje tem dia", () => {
    expect(diaInicial(dias, "2026-11-08")?.data).toBe("2026-11-08");
  });

  it("senão abre o próximo dia", () => {
    expect(diaInicial(dias, "2026-11-12")?.data).toBe("2026-11-15");
  });

  it("senão abre o mais recente", () => {
    expect(diaInicial(dias, "2026-12-01")?.data).toBe("2026-11-22");
  });

  it("não abre nada quando não há dias", () => {
    expect(diaInicial([], "2026-11-12")).toBeNull();
  });
});

describe("dataDoNovoDia", () => {
  it("sugere o próximo domingo", () => {
    // 12/11/2026 é quinta-feira.
    expect(dataDoNovoDia([], "2026-11-12")).toBe("2026-11-15");
  });

  it("sugere hoje quando hoje é domingo e está livre", () => {
    expect(dataDoNovoDia([], "2026-11-15")).toBe("2026-11-15");
  });

  it("pula os domingos que já têm dia", () => {
    expect(dataDoNovoDia([dia("2026-11-15"), dia("2026-11-22")], "2026-11-15")).toBe("2026-11-29");
  });

  it("atravessa a virada do ano", () => {
    expect(dataDoNovoDia([], "2026-12-28")).toBe("2027-01-03");
  });
});

describe("marcaDoDia", () => {
  const dias = diasAtivos([dia("2026-11-22"), dia("2026-11-15"), dia("2026-11-12"), dia("2026-11-08")]);
  const marca = (data: string, hoje: string) => marcaDoDia(dias.find((d) => d.data === data)!, dias, hoje);

  it("marca hoje quando o dia é hoje, e não marca próximo", () => {
    expect(marca("2026-11-12", "2026-11-12")).toBe("hoje");
    expect(marca("2026-11-15", "2026-11-12")).toBeNull();
  });

  it("marca o próximo dia quando hoje não tem dia", () => {
    expect(marca("2026-11-15", "2026-11-13")).toBe("próximo");
    expect(marca("2026-11-22", "2026-11-13")).toBeNull();
    expect(marca("2026-11-12", "2026-11-13")).toBeNull();
  });
});

describe("vizinhos", () => {
  const dias = diasAtivos([dia("2026-11-15"), dia("2026-11-08"), dia("2026-11-01")]);
  const datas = (v: ReturnType<typeof vizinhos>) => [v.anterior?.data ?? null, v.seguinte?.data ?? null];

  it("o anterior é o mais antigo e o seguinte o mais novo", () => {
    expect(datas(vizinhos(dias, "2026-11-08"))).toEqual(["2026-11-01", "2026-11-15"]);
  });

  it("não tem vizinho depois das pontas", () => {
    expect(datas(vizinhos(dias, "2026-11-15"))).toEqual(["2026-11-08", null]);
    expect(datas(vizinhos(dias, "2026-11-01"))).toEqual([null, "2026-11-08"]);
  });

  it("sem dia escolhido (Todos os dias), não tem vizinhos", () => {
    expect(datas(vizinhos(dias, "todos"))).toEqual([null, null]);
  });
});

describe("agruparPorMes", () => {
  it("agrupa por mês na ordem da lista", () => {
    const dias = diasAtivos(["2026-11-08", "2026-10-25", "2026-10-11", "2026-09-27"].map((d) => dia(d)));
    expect(agruparPorMes(dias).map(([mes, doMes]) => [mes, ids(doMes)])).toEqual([
      ["Novembro de 2026", ["2026-11-08"]],
      ["Outubro de 2026", ["2026-10-25", "2026-10-11"]],
      ["Setembro de 2026", ["2026-09-27"]],
    ]);
  });
});
