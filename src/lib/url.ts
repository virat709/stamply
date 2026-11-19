/** Normalise an owner-entered URL and refuse script-capable schemes.
 *  Returns null for empty/invalid values so callers can filter them out. */
export function safeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Only http(s) may be rendered as a link. Everything else is either
  // upgraded (bare domains like www.example.com/menu) or rejected.
  if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
