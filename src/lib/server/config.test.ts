import { afterEach, describe, it, expect, vi } from "vitest";
import { adminCredentials, credentialStatus, firebasePrivateKey, missingServerEnv, storeConfigMessage } from "./config";

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

  it("accepts a base64-encoded service account", () => {
    const sa = JSON.stringify({ client_email: "b64@proj.iam.gserviceaccount.com", private_key: "b64-key" });
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_BASE64", Buffer.from(sa).toString("base64"));
    const c = adminCredentials();
    expect(c.clientEmail).toBe("b64@proj.iam.gserviceaccount.com");
    expect(c.privateKey).toBe("b64-key");
  });

  it("accepts a quoted service-account JSON value", () => {
    const sa = JSON.stringify({ client_email: "quoted@proj.iam.gserviceaccount.com", private_key: "quoted-key" });
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS_JSON", `"${sa}"`);
    const c = adminCredentials();
    expect(c.clientEmail).toBe("quoted@proj.iam.gserviceaccount.com");
    expect(c.privateKey).toBe("quoted-key");
  });

  it("accepts GOOGLE_ credential aliases", () => {
    vi.stubEnv("GOOGLE_CLIENT_EMAIL", "google@proj.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "google-key");
    const c = adminCredentials();
    expect(c.clientEmail).toBe("google@proj.iam.gserviceaccount.com");
    expect(c.privateKey).toBe("google-key");
  });

  it("strips wrapping quotes from a private key value", () => {
    vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", '"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----"');
    expect(adminCredentials().privateKey).toBe("-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----");
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

  it("reports a service-account var that is set but malformed instead of silently treating it as absent", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "p");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "not json {");
    expect(missingServerEnv().join(" ")).toContain("not valid JSON");
  });
});

describe("credentialStatus", () => {
  it("reports which credential variable names are set, never their values", () => {
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "super-secret-value");
    vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "admin@proj.iam.gserviceaccount.com");
    const status = credentialStatus();
    expect(status.presentCredentialVars).toContain("GOOGLE_PRIVATE_KEY");
    expect(status.presentCredentialVars).toContain("FIREBASE_ADMIN_CLIENT_EMAIL");
    expect(JSON.stringify(status)).not.toContain("super-secret-value");
  });

  it("spots credential-like variable names outside the known aliases", () => {
    vi.stubEnv("MY_WEIRD_FIREBASE_SERVICE_ACCOUNT_THING", "value-should-not-appear");
    const status = credentialStatus();
    expect(status.credentialLikeVars).toContain("MY_WEIRD_FIREBASE_SERVICE_ACCOUNT_THING");
    expect(JSON.stringify(status)).not.toContain("value-should-not-appear");
  });
});
