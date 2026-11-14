import { expect, test } from "@playwright/test";

test("GET /api/health responds ok with noindex", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(await response.json()).toEqual({ ok: true });
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});
