import "server-only";
import { createClient } from "@/lib/supabase/server";
import { insightDb } from "@/lib/insight-db";
import { isSysadmin, userCatalogAccess } from "@/lib/insight-catalog";
import { getSessionUser } from "@/lib/session-user";
import { logDuration, startTiming } from "@/lib/server-log";
import type { SurveyImportOrganization, SurveyImportProgress } from "@/lib/insight-survey-imports";

export async function importActor() {
  const user = await getSessionUser();
  if (!user) throw new Error("Inicia sesión para importar encuestas.");
  const admin = await isSysadmin(user.id);
  if (!(await userCatalogAccess(user.id, admin)).has("encuestas")) throw new Error("No tienes acceso a Encuestas.");
  return { supabase: await createClient(), userId: user.id, admin };
}

export async function createOrganizations(actor: Awaited<ReturnType<typeof importActor>>): Promise<SurveyImportOrganization[]> {
  const result = await insightDb().query(`select o.id, o.name, o.code_prefix,
    (coalesce(seq.study_last, 0) + 1)::int as next_study_number,
    (coalesce(seq.instrument_last, 0) + 1)::int as next_instrument_number
    from insight_core.core_organizations o
    left join insight_survey.survey_code_sequences seq on seq.organization_id = o.id
    where o.status = 'active' and ($2::boolean or exists (
      select 1 from insight_iam.iam_organization_memberships m
      where m.organization_id = o.id and m.user_id = $1 and m.status = 'active'
    )) order by o.name`, [actor.userId, actor.admin]);
  if (actor.admin) return result.rows;
  const checks = await Promise.all(result.rows.map(async (org: SurveyImportOrganization) => {
    const [access, create] = await Promise.all([
      actor.supabase.rpc("iam_has_permission", { p_org: org.id, p_code: "survey.access" }),
      actor.supabase.rpc("iam_has_permission", { p_org: org.id, p_code: "survey.create" }),
    ]);
    return !access.error && access.data === true && !create.error && create.data === true;
  }));
  return result.rows.filter((_: SurveyImportOrganization, index: number) => checks[index]);
}

export async function listUnfinishedSurveyImports(): Promise<SurveyImportProgress[]> {
  const started = startTiming();
  const actor = await importActor();
  const organizations = await createOrganizations(actor);
  if (!organizations.length) {
    await logDuration("surveys.import_progress", started, { organizations: 0, jobs: 0 });
    return [];
  }
  const result = await insightDb().query(`select j.id, j.organization_id, o.name as organization_name,
    j.study_name, j.study_code, j.instrument_name, j.instrument_code, j.version,
    j.source_filename, j.status, j.error_message, j.workflow_run_id
    from insight_survey.survey_import_jobs j
    join insight_core.core_organizations o on o.id = j.organization_id
    where j.organization_id = any($1::uuid[]) and j.status <> 'completed'
    order by j.created_at desc`, [organizations.map((org) => org.id)]);
  await logDuration("surveys.import_progress", started, { organizations: organizations.length, jobs: result.rows.length });
  return result.rows as SurveyImportProgress[];
}
