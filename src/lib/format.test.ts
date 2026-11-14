import { describe, expect, it } from "vitest";
import { diaPorExtenso, diasEntre, formatarBRL, hojeLocal, mesPorExtenso, rotuloComSemana, rotuloDia, seloDia } from "./format";

describe("formato", () => {
  it("mostra reais sem centavos quando não há centavos", () => {
    expect(formatarBRL(3600)).toBe("R$ 36");
    expect(formatarBRL(29200)).toBe("R$ 292");
    expect(formatarBRL(1250)).toBe("R$ 12,50");
    expect(formatarBRL(0)).toBe("R$ 0");
    expect(formatarBRL(123456)).toBe("R$ 1.234,56");
  });

  it("formata datas de dia de venda sem depender do fuso", () => {
    expect(rotuloDia("2026-11-01")).toBe("01 nov");
    expect(mesPorExtenso("2026-10-18")).toBe("Outubro de 2026");
    expect(mesPorExtenso("2026-03-01")).toBe("Março de 2026");
    expect(diaPorExtenso("2026-11-15")).toBe("Domingo, 15 de novembro");
    expect(diaPorExtenso("2026-10-18")).toBe("Domingo, 18 de outubro");
    expect(rotuloComSemana("2026-11-15")).toBe("Dom, 15 nov");
    expect(rotuloComSemana("2026-11-07")).toBe("Sáb, 7 nov");
    expect(rotuloComSemana("2027-01-01")).toBe("Sex, 1 jan");
    expect(seloDia("2026-11-15")).toEqual({ dia: "15", mes: "nov" });
  });

  it("conta dias entre datas", () => {
    expect(diasEntre("2026-10-18", "2026-11-04")).toBe(17);
    expect(diasEntre("2026-11-04", "2026-11-04")).toBe(0);
  });

  it("usa a data local do aparelho para hoje", () => {
    expect(hojeLocal(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
