import { describe, expect, it } from "vitest";
import { codigoEquipeValido, exigirCodigoEquipe, HEADER_CODIGO_EQUIPE } from "./codigo-acesso";

describe("codigoEquipeValido", () => {
  it("aceita o código certo", () => {
    expect(codigoEquipeValido("casa-teste", "casa-teste")).toBe(true);
  });

  it("recusa código errado, inclusive com tamanho diferente", () => {
    expect(codigoEquipeValido("casa-tesTe", "casa-teste")).toBe(false);
    expect(codigoEquipeValido("casa", "casa-teste")).toBe(false);
    expect(codigoEquipeValido("casa-teste-longo", "casa-teste")).toBe(false);
  });

  it("recusa quando não veio código", () => {
    expect(codigoEquipeValido(null, "casa-teste")).toBe(false);
    expect(codigoEquipeValido(undefined, "casa-teste")).toBe(false);
    expect(codigoEquipeValido("", "casa-teste")).toBe(false);
  });

  it("recusa tudo quando o servidor não tem código configurado", () => {
    expect(codigoEquipeValido("qualquer", undefined)).toBe(false);
    expect(codigoEquipeValido("", "")).toBe(false);
  });
});

describe("exigirCodigoEquipe", () => {
  it("devolve 401 sem o header e null com o código certo", async () => {
    process.env.CODIGO_ACESSO_EQUIPE = "casa-teste";

    const semCodigo = exigirCodigoEquipe(new Request("http://localhost/api/produtos"));
    expect(semCodigo?.status).toBe(401);

    const comCodigo = exigirCodigoEquipe(
      new Request("http://localhost/api/produtos", {
        headers: { [HEADER_CODIGO_EQUIPE]: "casa-teste" },
      }),
    );
    expect(comCodigo).toBeNull();
  });
});
