/**
 * Pure SQL generator for the no-code query builder. Supports a single base table
 * or a 2-table JOIN. Identifiers come from a whitelist (the datasets' known
 * columns) and are alias-qualified when joining; values are sanitized. Runs under
 * the app_readonly sandbox regardless, so the blast radius stays read-only.
 */

export type ColumnType = "integer" | "numeric" | "boolean" | "text" | string;
export type Alias = "t0" | "t1";
export type FilterOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains";

export type ColumnRef = { alias: Alias; key: string };
export type BuilderFilter = { col: ColumnRef; op: FilterOp; value: string };
export type BuilderMeasure = { col: ColumnRef; fn: "sum" | "avg" | "count" | "min" | "max" };
export type JoinSpec = { table: string; type: "inner" | "left"; left: string; right: string };

export type BuilderState = {
  base: string; // physical table for t0
  join?: JoinSpec;
  dimensions: ColumnRef[];
  measures: BuilderMeasure[];
  filters: BuilderFilter[];
  limit: number;
};

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;
const isNumericType = (t?: ColumnType) => t === "integer" || t === "numeric";

function literal(value: string, type?: ColumnType): string {
  if (isNumericType(type) && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return String(Number(value));
  }
  if (type === "boolean") return value === "true" ? "true" : "false";
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildSql(
  state: BuilderState,
  typeOf: (ref: ColumnRef) => ColumnType | undefined,
): string {
  const hasJoin = !!state.join;
  const qual = (ref: ColumnRef) =>
    hasJoin ? `${ident(ref.alias)}.${ident(ref.key)}` : ident(ref.key);
  const outName = (ref: ColumnRef) => (hasJoin ? `${ref.alias}_${ref.key}` : ref.key);

  const selectParts: string[] = [];
  for (const d of state.dimensions) selectParts.push(`${qual(d)} as ${ident(outName(d))}`);
  for (const m of state.measures) {
    const inner = m.fn === "count" ? "*" : qual(m.col);
    selectParts.push(`${m.fn}(${inner}) as ${ident(`${outName(m.col)}_${m.fn}`)}`);
  }
  if (selectParts.length === 0) selectParts.push("*");

  let from = `${state.base} as t0`;
  if (state.join) {
    from += `\n${state.join.type} join ${state.join.table} as t1 on ${ident("t0")}.${ident(
      state.join.left,
    )} = ${ident("t1")}.${ident(state.join.right)}`;
  }

  const whereParts = state.filters
    .filter((f) => f.col?.key)
    .map((f) => {
      const col = qual(f.col);
      const t = typeOf(f.col);
      if (f.op === "contains") return `${col} ilike ${literal(`%${f.value}%`, "text")}`;
      return `${col} ${f.op} ${literal(f.value, t)}`;
    });

  const hasGroup = state.measures.length > 0 && state.dimensions.length > 0;

  let sql = `select ${selectParts.join(", ")}\nfrom ${from}`;
  if (whereParts.length) sql += `\nwhere ${whereParts.join(" and ")}`;
  if (hasGroup) sql += `\ngroup by ${state.dimensions.map(qual).join(", ")}`;
  sql += `\nlimit ${Math.max(1, Math.min(state.limit || 1000, 5000))}`;
  return sql;
}
