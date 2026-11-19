import { describe, it, expect } from "vitest";
import { safeUrl } from "./url";

describe("safeUrl", () => {
  it("rejects script-capable schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl(" JavaScript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>")).toBeNull();
    expect(safeUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeUrl("file:///etc/passwd")).toBeNull();
    expect(safeUrl("blob:https://x/y")).toBeNull();
  });

  it("upgrades bare domains to https", () => {
    expect(safeUrl("www.example.com/menu")).toBe("https://www.example.com/menu");
    expect(safeUrl("localhost:3000")).toBe("https://localhost:3000/");
  });

  it("keeps valid http(s) URLs", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("returns null for empty or unparseable input", () => {
    expect(safeUrl("")).toBeNull();
    expect(safeUrl("   ")).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl("https://")).toBeNull();
  });
});
