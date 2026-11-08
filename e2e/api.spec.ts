import { expect, test } from "@playwright/test";

test("GET /api/produtos sem código responde 401", async ({ request }) => {
  const resposta = await request.get("/api/produtos");
  expect(resposta.status()).toBe(401);
});

test("GET /api/produtos com código errado responde 401", async ({ request }) => {
  const resposta = await request.get("/api/produtos", {
    headers: { "x-codigo-equipe": "codigo-errado" },
  });
  expect(resposta.status()).toBe(401);
});

test("GET /api/health responde ok com noindex", async ({ request }) => {
  const resposta = await request.get("/api/health");
  expect(await resposta.json()).toEqual({ ok: true });
  expect(resposta.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});
