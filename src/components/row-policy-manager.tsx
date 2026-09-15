"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRowPolicy, deleteRowPolicy } from "@/app/(app)/datasets/policy-actions";

type Policy = {
  id: string;
  column_key: string;
  principal_type: string;
  principal_id: string;
  allowed_value: string;
};
type Member = { id: string; display_name: string | null };

export function RowPolicyManager({
  datasetId,
  columns,
  policies,
  members,
}: {
  datasetId: string;
  columns: { key: string; name: string }[];
  policies: Policy[];
  members: Member[];
}) {
  const router = useRouter();
  const [columnKey, setColumnKey] = useState(columns[0]?.key ?? "");
  const [principalType, setPrincipalType] = useState<"role" | "user">("role");
  const [principalId, setPrincipalId] = useState("viewer");
  const [allowedValue, setAllowedValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const memberName = (id: string) => members.find((m) => m.id === id)?.display_name ?? id;

  function add() {
    setError(null);
    start(async () => {
      const res = await createRowPolicy({ datasetId, columnKey, principalType, principalId, allowedValue });
      if ("error" in res) setError(res.error);
      else {
        setAllowedValue("");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-card-foreground">Seguridad a nivel de fila</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Restringe qué filas puede ver cada rol o usuario. Los administradores ven todo. Si una
        columna está restringida y el usuario no tiene un valor permitido, no verá filas.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <select
          value={columnKey}
          onChange={(e) => setColumnKey(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          {columns.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={principalType}
          onChange={(e) => {
            const t = e.target.value as "role" | "user";
            setPrincipalType(t);
            setPrincipalId(t === "role" ? "viewer" : (members[0]?.id ?? ""));
          }}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="role">Rol</option>
          <option value="user">Usuario</option>
        </select>
        {principalType === "role" ? (
          <select
            value={principalId}
            onChange={(e) => setPrincipalId(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
          </select>
        ) : (
          <select
            value={principalId}
            onChange={(e) => setPrincipalId(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name ?? m.id}
              </option>
            ))}
          </select>
        )}
        <input
          value={allowedValue}
          onChange={(e) => setAllowedValue(e.target.value)}
          placeholder="valor permitido"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
        <button
          onClick={add}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {policies.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin restricciones (todos ven todo).</li>
        )}
        {policies.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
          >
            <span>
              <span className="font-mono text-xs">{p.column_key}</span> ={" "}
              <strong>{p.allowed_value}</strong> para {p.principal_type === "role" ? "rol" : "usuario"}{" "}
              <strong>{p.principal_type === "user" ? memberName(p.principal_id) : p.principal_id}</strong>
            </span>
            <button
              onClick={() => start(async () => { await deleteRowPolicy(p.id, datasetId); router.refresh(); })}
              className="text-xs text-muted-foreground hover:text-danger"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
