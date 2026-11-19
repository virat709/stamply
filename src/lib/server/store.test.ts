import { describe, it, expect } from "vitest";
import {
  STAMP_COOLDOWN_MS,
  businessKey,
  cardIdFor,
  customerIdForPhone,
  newStampCode,
  normalizePhone,
  safeDecode,
  stampGuard,
  tokenDocId,
} from "./store";

describe("businessKey", () => {
  it("normalises case and whitespace", () => {
    expect(businessKey("  Demo-Cafe ")).toBe("demo-cafe");
    expect(businessKey("")).toBe("");
  });
});

describe("tokenDocId", () => {
  it("always produces the same id for the same code/business", () => {
    expect(tokenDocId("Demo-Cafe", " abc123 ")).toBe("ABC123_demo-cafe");
    expect(tokenDocId("demo-cafe", "ABC123")).toBe("ABC123_demo-cafe");
  });
});

describe("cardIdFor", () => {
  it("composes business and customer ids", () => {
    expect(cardIdFor("cafe", "c_1")).toBe("cafe__c_1");
  });
});

describe("customerIdForPhone", () => {
  it("is stable across formatting differences", () => {
    expect(customerIdForPhone("+1 (555) 010-2233")).toBe(customerIdForPhone("+15550102233"));
  });

  it("differs for different numbers", () => {
    expect(customerIdForPhone("+15550102233")).not.toBe(customerIdForPhone("+15550102234"));
  });

  it("produces a safe document id", () => {
    expect(customerIdForPhone("+15550102233")).toMatch(/^c_[a-f0-9]{24}$/);
  });
});

describe("normalizePhone", () => {
  it("keeps digits and a leading plus only", () => {
    expect(normalizePhone("+1 (555) 010-2233")).toBe("+15550102233");
    expect(normalizePhone("abc")).toBe("");
  });
});

describe("safeDecode", () => {
  it("decodes valid input", () => {
    expect(safeDecode("caf%C3%A9")).toBe("café");
  });

  it("returns malformed input instead of throwing", () => {
    expect(safeDecode("%E0%A4%A")).toBe("%E0%A4%A");
  });
});

describe("newStampCode", () => {
  it("is six characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 100; i++) {
      const code = newStampCode();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });
});

describe("stampGuard", () => {
  it("rejects a full card", () => {
    expect(() => stampGuard({ currentStamps: 10 }, 10)).toThrow(/redeem/i);
  });

  it("rejects a stamp within the cooldown window", () => {
    expect(() =>
      stampGuard({ currentStamps: 3, lastStampAt: new Date().toISOString() }, 10)
    ).toThrow(/wait a minute/i);
  });

  it("allows a stamp after the cooldown", () => {
    const old = new Date(Date.now() - STAMP_COOLDOWN_MS - 1_000).toISOString();
    expect(() => stampGuard({ currentStamps: 3, lastStampAt: old }, 10)).not.toThrow();
  });
});
