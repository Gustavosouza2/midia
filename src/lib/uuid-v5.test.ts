import { describe, expect, it } from "vitest";
import { uuidV5 } from "./uuid-v5";

const NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("uuidV5", () => {
  it("matches the known vector for www.example.com in the DNS namespace", async () => {
    expect(await uuidV5("www.example.com", NAMESPACE_DNS)).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
  });

  it("changes when the name or the namespace changes", async () => {
    const otherNamespace = "00000000-0000-4000-8000-000000000001";
    const base = await uuidV5("2026-11-15", NAMESPACE_DNS);
    expect(await uuidV5("2026-11-22", NAMESPACE_DNS)).not.toBe(base);
    expect(await uuidV5("2026-11-15", otherNamespace)).not.toBe(base);
  });
});
