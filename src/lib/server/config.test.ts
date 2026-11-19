import { afterEach, describe, it, expect, vi } from "vitest";
import { missingServerEnv, storeConfigMessage, REQUIRED_SERVER_ENV } from "./config";

const original = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...original };
});

describe("missingServerEnv", () => {
  it("reports every missing or blank server variable by name", () => {
    for (const name of REQUIRED_SERVER_ENV) vi.stubEnv(name, "");
    expect(missingServerEnv()).toEqual([...REQUIRED_SERVER_ENV]);
  });

  it("returns an empty list when everything is configured", () => {
    for (const name of REQUIRED_SERVER_ENV) vi.stubEnv(name, "value");
    expect(missingServerEnv()).toEqual([]);
    expect(storeConfigMessage()).toBe("Server data store is ready.");
  });

  it("never includes a secret value in the message", () => {
    const secret = "super-secret-private-key";
    for (const name of REQUIRED_SERVER_ENV) vi.stubEnv(name, name === "FIREBASE_ADMIN_PRIVATE_KEY" ? secret : "value");
    vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "");
    expect(storeConfigMessage()).not.toContain(secret);
    expect(storeConfigMessage()).toContain("FIREBASE_ADMIN_CLIENT_EMAIL");
  });
});
