import { expect, test } from "@playwright/test";

test("GET /api/health responde ok com noindex", async ({ request }) => {
  const resposta = await request.get("/api/health");
  expect(await resposta.json()).toEqual({ ok: true });
  expect(resposta.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});
