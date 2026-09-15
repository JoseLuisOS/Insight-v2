"use client";

import { useState, useTransition } from "react";
import { updateMember } from "@/app/(app)/team/actions";

type Member = {
  id: string;
  display_name: string | null;
  role: "admin" | "editor" | "viewer";
  can_publish: boolean;
};

const ROLES: Member["role"][] = ["admin", "editor", "viewer"];

export function TeamTable({
  members,
  isAdmin,
  currentUserId,
}: {
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Miembro</th>
            <th className="px-3 py-2 text-left font-medium">Rol</th>
            <th className="px-3 py-2 text-left font-medium">Puede publicar</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <Row
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              isSelf={m.id === currentUserId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  member,
  isAdmin,
  isSelf,
}: {
  member: Member;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [role, setRole] = useState(member.role);
  const [canPublish, setCanPublish] = useState(member.can_publish);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function persist(next: { role?: Member["role"]; canPublish?: boolean }) {
    const r = next.role ?? role;
    const c = next.canPublish ?? canPublish;
    start(async () => {
      const res = await updateMember(member.id, r, c);
      if (!("error" in res)) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2">
        {member.display_name ?? "—"}
        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
      </td>
      <td className="px-3 py-2">
        {isAdmin ? (
          <select
            value={role}
            disabled={pending}
            onChange={(e) => {
              const r = e.target.value as Member["role"];
              setRole(r);
              persist({ role: r });
            }}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="capitalize">{role}</span>
        )}
      </td>
      <td className="px-3 py-2">
        {isAdmin ? (
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={canPublish}
              disabled={pending}
              onChange={(e) => {
                setCanPublish(e.target.checked);
                persist({ canPublish: e.target.checked });
              }}
            />
            <span className="text-xs text-muted-foreground">
              {saved ? "Guardado" : canPublish ? "Sí" : "No"}
            </span>
          </label>
        ) : (
          <span>{canPublish ? "Sí" : "No"}</span>
        )}
      </td>
    </tr>
  );
}
