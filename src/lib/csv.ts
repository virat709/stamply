/** RFC 4180 escaping plus spreadsheet formula-injection protection.
 *
 *  Customer names and phone numbers are attacker-controlled; a value starting
 *  with =, +, -, @ (or tab/CR) is executed as a formula by Excel/Sheets when
 *  the owner opens the export. Prefixing with an apostrophe keeps the text
 *  literal, and every value is quoted with internal quotes doubled. */
export function escapeCsvField(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}
