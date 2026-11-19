import { afterEach, describe, it, expect, vi } from "vitest";
import { adminCredentials, firebasePrivateKey, missingServerEnv, storeConfigMessage } from "./config";

const original = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...original };
});

describe("adminCredentials", () => {
  it("accepts the preferred variable names", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "proj");
    vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "admin@proj.iam.gserviceaccount.com");
    vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "key");
    expect(adminCredentials()).toEqual({
      projectId: "proj",
      clientEmail: "admin@proj.iam.gserviceaccount.com",
      privateKey: "key",
    });
  });

  it("accepts common alternative names", () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "proj2");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "other@proj.iam.gserviceaccount.com");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "key2");
    expect(adminCredentials()).toEqual({
      projectId: "proj2",
      clientEmail: "other@proj.iam.gserviceaccount.com",
      privateKey: "key2",
    });
  });

  it("accepts a full service-account JSON env var", () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", JSON.stringify({
      client_email: "json@proj.iam.gserviceaccount.com",
      private_key: "json-key",
    }));
    const c = adminCredentials();
    expect(c.clientEmail).toBe("json@proj.iam.gserviceaccount.com");
    expect(c.privateKey).toBe("json-key");
  });

  it("converts escaped newlines in the private key", () => {
    expect(firebasePrivateKey("line1\\nline2")).toBe("line1\nline2");
  });
});

describe("missingServerEnv", () => {
  it("lists missing credential groups by name only", () => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith("FIREBASE") || name.startsWith("NEXT_PUBLIC_FIREBASE")) vi.stubEnv(name, "");
    }
    expect(missingServerEnv()).toHaveLength(3);
    expect(storeConfigMessage()).not.toContain("key");
  });

  it("is empty when credentials resolve from aliases", () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "p");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "e");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "k");
    expect(missingServerEnv()).toEqual([]);
  });
});
