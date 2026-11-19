import { describe, it, expect } from "vitest";
import { escapeCsvField, toCsv } from "./csv";

describe("escapeCsvField", () => {
  it("quotes every field and doubles internal quotes", () => {
    expect(escapeCsvField('A "nickname"')).toBe('"A ""nickname"""');
  });

  it("neutralises spreadsheet formula injection", () => {
    for (const value of ["=1+1", "+1", "-1", "@SUM(A1)", "\tcmd", "\rcmd"]) {
      expect(escapeCsvField(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    }
  });

  it("handles null and undefined as empty", () => {
    expect(escapeCsvField(null)).toBe('""');
    expect(escapeCsvField(undefined)).toBe('""');
  });

  it("keeps ordinary values readable", () => {
    expect(escapeCsvField("Ava Chen")).toBe('"Ava Chen"');
    expect(escapeCsvField(42)).toBe('"42"');
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF", () => {
    expect(toCsv([["a"], ["b"]] )).toBe('"a"\r\n"b"');
  });
});
