import { describe, it, expect } from "vitest";
import { firstBusinessPath } from "./businesses";
import type { Business } from "./types";

const business = (id: string) => ({ id }) as Business;

describe("firstBusinessPath", () => {
  it("opens the first existing console", () => {
    expect(firstBusinessPath([business("cafe-a"), business("cafe-b")])).toBe("/dashboard/cafe-a");
  });

  it("returns null when there is no business, so onboarding is shown", () => {
    expect(firstBusinessPath([])).toBeNull();
    expect(firstBusinessPath(null)).toBeNull();
    expect(firstBusinessPath(undefined)).toBeNull();
  });

  it("ignores malformed records", () => {
    expect(firstBusinessPath([{ id: "" } as Business, business("cafe-a")])).toBe("/dashboard/cafe-a");
  });
});
