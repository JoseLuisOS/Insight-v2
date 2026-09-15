/**
 * CSV/table helpers: sanitize headers into safe SQL identifiers and infer
 * column types. Pure functions — no I/O — so they are easy to reason about and
 * mirror the safety guarantees enforced again in the `ingest_dataset` DB function.
 */

export type ColumnType = "integer" | "numeric" | "boolean" | "text";

export type Column = {
  /** Original header as seen in the file. */
  name: string;
  /** Sanitized, unique SQL identifier used as the physical column name. */
  key: string;
  type: ColumnType;
};

const RESERVED = new Set(["tenant_id"]);

/** Turn an arbitrary header into a safe, unique snake_case identifier. */
export function sanitizeKey(header: string, used: Set<string>): string {
  let key = (header ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (!key || !/^[a-z]/.test(key)) key = `col_${key}`;
  if (RESERVED.has(key)) key = `${key}_col`;
  if (key.length > 58) key = key.slice(0, 58);

  let candidate = key;
  let i = 2;
  while (used.has(candidate)) candidate = `${key}_${i++}`;
  used.add(candidate);
  return candidate;
}

const BOOL_VALUES = new Set([
  "true",
  "false",
  "verdadero",
  "falso",
  "sí",
  "si",
  "no",
  "1",
  "0",
]);

/** Infer a column type from a sample of string values (empty = ignored). */
export function inferType(values: string[]): ColumnType {
  const nonEmpty = values
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return "text";

  const allInt = nonEmpty.every((v) => /^-?\d+$/.test(v));
  if (allInt) return "integer";

  const allNum = nonEmpty.every((v) => /^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(v));
  if (allNum) return "numeric";

  const allBool = nonEmpty.every((v) => BOOL_VALUES.has(v.toLowerCase()));
  if (allBool && nonEmpty.some((v) => /[a-z]/i.test(v))) return "boolean";

  return "text";
}

export type ParsedTable = {
  columns: Column[];
  /** Rows keyed by sanitized column key. */
  rows: Record<string, string>[];
};

/**
 * Given raw headers + string matrix, produce sanitized columns (with inferred
 * types) and rows keyed by the sanitized identifiers.
 */
export function buildTable(headers: string[], matrix: string[][]): ParsedTable {
  const used = new Set<string>();
  const columns: Column[] = headers.map((h, idx) => {
    const key = sanitizeKey(h || `col_${idx + 1}`, used);
    const sample = matrix.slice(0, 200).map((r) => r[idx] ?? "");
    return { name: h || `Columna ${idx + 1}`, key, type: inferType(sample) };
  });

  const rows = matrix.map((r) => {
    const row: Record<string, string> = {};
    columns.forEach((c, idx) => {
      row[c.key] = r[idx] ?? "";
    });
    return row;
  });

  return { columns, rows };
}
