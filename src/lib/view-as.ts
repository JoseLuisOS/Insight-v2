import "server-only";
import { cookies } from "next/headers";
import { insightDb } from "@/lib/insight-db";
import { isSysadmin } from "@/lib/insight-catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export const VIEW_AS_COOKIE = "insight_view_as";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ViewedUser = { userId: string; organizationId: string; name: string; email: string | null; organizationName: string };

/** The cookie selects a view; the authenticated account remains the actor. */
export async function getViewedUser(actorId: string): Promise<ViewedUser | null> {
  const raw = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!raw || !(await isSysadmin(actorId))) return null;
  const [userId, organizationId] = raw.split(":");
  if (!uuid.test(userId ?? "") || !uuid.test(organizationId ?? "") || userId === actorId) return null;
  return findViewableUser(userId, organizationId);
}

export async function findViewableUser(userId: string, organizationId: string): Promise<ViewedUser | null> {
  if (!uuid.test(userId) || !uuid.test(organizationId)) return null;
  const { rows } = await insightDb().query(`select m.user_id, m.organization_id,
    coalesce(p.display_name, 'Usuario') as name, o.name as organization_name
    from insight_iam.iam_organization_memberships m
    join insight_core.core_organizations o on o.id = m.organization_id
    left join insight_core.core_user_profiles p on p.user_id = m.user_id
    where m.user_id = $1 and m.organization_id = $2 and m.status = 'active' and o.status = 'active'
      and not exists (select 1 from insight_iam.iam_platform_admins a where a.user_id = m.user_id)
    limit 1`, [userId, organizationId]);
  const row = rows[0];
  if (!row) return null;
  const { data: { user } } = await createAdminClient().auth.admin.getUserById(userId);
  return { userId: row.user_id, organizationId: row.organization_id, name: row.name, email: user?.email ?? null, organizationName: row.organization_name };
}
