import "server-only";
import { notFound, redirect } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session-user";
import { logDuration, startTiming } from "@/lib/server-log";
import { isSysadmin, userCatalogAccess } from "@/lib/insight-catalog";

export type SurveyOrganization = { id: string; name: string };
export type SurveyNameChoice = {
  organization_id: string; study_id: string; study_name: string; study_code: string;
  instrument_id: string | null; instrument_name: string | null; instrument_code: string | null;
};
export type SurveySummary = {
  id: string;
  organization_id: string;
  organization_name: string;
  study_id: string;
  study_code: string;
  study_name: string;
  study_description: string | null;
  code: string;
  name: string;
  description: string | null;
  instrument_type: string;
  version: string | null;
  status: string | null;
  question_count: number;
  observation_count: number;
  created_at: string | Date;
  created_by_name: string | null;
  metadata: Record<string, unknown>;
  version_created_at: string | Date | null;
  version_source_file: string | null;
  version_valid_from: string | Date | null;
  version_valid_to: string | Date | null;
};
export type SurveySection = { id: string; code: string; title: string; description: string | null; position: number };
export type SurveyQuestion = {
  id: string;
  section_id: string | null;
  code: string;
  text: string;
  question_type: string;
  required: boolean;
  position: number;
  variable_codes: string[];
  options: { code: string; label: string; value: string }[];
};
export type SurveyVersion = { id: string; version: string; name: string | null; status: string; question_count: number; observation_count: number };
export type SurveyDetail = { survey: SurveySummary; sections: SurveySection[]; questions: SurveyQuestion[]; versions: SurveyVersion[]; canDelete: boolean };
export type SurveyQuestionAnalytics = {
  detail: SurveyDetail;
  version: SurveyVersion | null;
  question: SurveyQuestion | null;
  total: number;
  answered: number;
  missing: number;
  distinct: number;
  average: number | null;
  median: number | null;
  minimum: number | null;
  maximum: number | null;
  distribution: { label: string; count: number }[];
};
export type SurveyObservation = { id: string; external_id: string | null; status: string; answer_count: number };
export type SurveyAnswer = {
  question_code: string; question_text: string; variable_code: string;
  raw_value: string | null; value_text: string | null; option_label: string | null;
  is_missing: boolean; missing_type: string | null; quality_status: string;
};
export type SurveyQuestionResponsePage = {
  survey: SurveySummary; version: SurveyVersion; question: SurveyQuestion;
  observations: Pick<SurveyObservation, "id" | "external_id" | "status">[];
  answers: (Pick<SurveyAnswer, "variable_code" | "raw_value" | "value_text" | "option_label" | "is_missing" | "missing_type" | "quality_status"> & { observation_id: string; variable_id: string })[];
  page: number; pageCount: number;
};
export type SurveyTablePage = {
  version: SurveyVersion;
  columns: { id: string; question_id: string; code: string; question_code: string; question_text: string }[];
  rows: (Pick<SurveyObservation, "id" | "external_id" | "status"> & { values: Record<string, string> })[];
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const surveyOptionCollator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

async function queryRows<T>(sql: string, params: unknown[]): Promise<T[]> {
  const result = await insightDb().query(sql, params);
  return result.rows as T[];
}

type SurveyDeleteClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rowCount: number | null }>;
};

async function deleteSurveyVersionDataInBatches(client: SurveyDeleteClient, versionIds: string[], organizationId: string) {
  if (!versionIds.length) return;
  const params = [versionIds, organizationId];
  while (true) {
    const responses = await client.query(`with batch as (
        select r.ctid
        from insight_survey.survey_responses r
        join insight_survey.survey_observations o on o.id = r.observation_id and o.organization_id = r.organization_id
        where o.instrument_version_id = any($1::uuid[]) and o.organization_id = $2
        limit 100
      )
      delete from insight_survey.survey_responses r using batch
      where r.ctid = batch.ctid`, params);
    if (!responses.rowCount) break;
  }
  while (true) {
    const observations = await client.query(`with batch as (
        select o.ctid
        from insight_survey.survey_observations o
        where o.instrument_version_id = any($1::uuid[]) and o.organization_id = $2
        limit 100
      )
      delete from insight_survey.survey_observations o using batch
      where o.ctid = batch.ctid`, params);
    if (!observations.rowCount) break;
  }
}

async function surveyActor() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const admin = await isSysadmin(user.id);
  if (!(await userCatalogAccess(user.id, admin)).has("encuestas")) notFound();
  return { supabase, userId: user.id, admin };
}

async function allowedOrganizations(actor: Awaited<ReturnType<typeof surveyActor>>): Promise<SurveyOrganization[]> {
  const rows = await queryRows<SurveyOrganization>(`select o.id, o.name
    from insight_core.core_organizations o
    where o.status = 'active' and ($2::boolean or exists (
      select 1 from insight_iam.iam_organization_memberships m
      where m.organization_id = o.id and m.user_id = $1 and m.status = 'active'
    )) order by o.name`, [actor.userId, actor.admin]);
  if (actor.admin) return rows;
  const checks = await Promise.all(rows.map(async (org) => {
    const [access, view] = await Promise.all([
      actor.supabase.rpc("iam_has_permission", { p_org: org.id, p_code: "survey.access" }),
      actor.supabase.rpc("iam_has_permission", { p_org: org.id, p_code: "survey.view" }),
    ]);
    return !access.error && access.data === true && !view.error && view.data === true;
  }));
  return rows.filter((_, index) => checks[index]);
}

export async function canViewSurveyResource(actor: { userId: string; admin: boolean }, organizationId: string, instrumentId: string) {
  if (actor.admin) return true;
  const rows = await queryRows<{ access_mode: string; effect: string | null }>(`select r.access_mode, grant_effect.effect
    from insight_iam.iam_resources r
    left join lateral (
      select rp.effect
      from insight_iam.iam_resource_permissions rp
      join insight_iam.iam_permissions p on p.id = rp.permission_id and p.code = 'survey.view'
      where rp.resource_id = r.id and (
        rp.membership_id in (select m.id from insight_iam.iam_organization_memberships m
          where m.organization_id = $1 and m.user_id = $3 and m.status = 'active')
        or rp.role_id in (select mr.role_id from insight_iam.iam_membership_roles mr
          join insight_iam.iam_organization_memberships m on m.id = mr.membership_id
          where m.organization_id = $1 and m.user_id = $3 and m.status = 'active')
      )
    ) grant_effect on true
    where r.organization_id = $1 and r.resource_type = 'survey' and r.domain_resource_id = $2`,
    [organizationId, instrumentId, actor.userId]);
  if (!rows.length) return true;
  if (rows.some((row) => row.effect === "deny")) return false;
  return rows[0].access_mode === "organization" || rows.some((row) => row.effect === "allow");
}

export async function visibleSurveyResources(actor: { userId: string; admin: boolean }, instruments: { id: string; organization_id: string }[]): Promise<boolean[]> {
  if (actor.admin || !instruments.length) return instruments.map(() => true);
  const rows = await queryRows<{ id: string; organization_id: string; access_mode: string; effect: string | null }>(`select r.domain_resource_id as id,
    r.organization_id, r.access_mode, grant_effect.effect
    from insight_iam.iam_resources r
    left join lateral (
      select rp.effect
      from insight_iam.iam_resource_permissions rp
      join insight_iam.iam_permissions p on p.id = rp.permission_id and p.code = 'survey.view'
      where rp.resource_id = r.id and (
        rp.membership_id in (select m.id from insight_iam.iam_organization_memberships m
          where m.organization_id = r.organization_id and m.user_id = $3 and m.status = 'active')
        or rp.role_id in (select mr.role_id from insight_iam.iam_membership_roles mr
          join insight_iam.iam_organization_memberships m on m.id = mr.membership_id
          where m.organization_id = r.organization_id and m.user_id = $3 and m.status = 'active')
      )
    ) grant_effect on true
    where r.resource_type = 'survey' and r.domain_resource_id = any($1::uuid[])
      and r.organization_id = any($2::uuid[])`, [
    [...new Set(instruments.map((item) => item.id))],
    [...new Set(instruments.map((item) => item.organization_id))],
    actor.userId,
  ]);
  const visibility = new Map<string, { organization: boolean; allow: boolean; deny: boolean }>();
  for (const row of rows) {
    const key = `${row.organization_id}:${row.id}`;
    const state = visibility.get(key) ?? { organization: false, allow: false, deny: false };
    state.organization ||= row.access_mode === "organization";
    state.allow ||= row.effect === "allow";
    state.deny ||= row.effect === "deny";
    visibility.set(key, state);
  }
  return instruments.map(({ id, organization_id }) => {
    const state = visibility.get(`${organization_id}:${id}`);
    return !state || (!state.deny && (state.organization || state.allow));
  });
}

export async function listSurveyNameChoices(): Promise<SurveyNameChoice[]> {
  const actor = await surveyActor();
  const organizations = await allowedOrganizations(actor);
  if (!organizations.length) return [];
  const rows = await queryRows<SurveyNameChoice>(`select s.organization_id, s.id as study_id,
    s.name as study_name, s.code as study_code, i.id as instrument_id,
    i.name as instrument_name, i.code as instrument_code
    from insight_survey.survey_studies s
    left join insight_survey.survey_instruments i on i.study_id = s.id and i.organization_id = s.organization_id
    where s.organization_id = any($1::uuid[])
    order by s.name, i.name`, [organizations.map((organization) => organization.id)]);
  const visibleInstruments = rows.filter((row) => row.instrument_id).map((row) => ({
    id: row.instrument_id!, organization_id: row.organization_id,
  }));
  const visibleValues = await visibleSurveyResources(actor, visibleInstruments);
  let visibleIndex = 0;
  const visible = rows.map((row) => row.instrument_id ? visibleValues[visibleIndex++] : true);
  return rows.filter((_, index) => visible[index]);
}

export async function listSurveys(): Promise<{ organizations: SurveyOrganization[]; surveys: SurveySummary[]; deletableStudyIds: string[]; deletableInstrumentIds: string[]; versionsByInstrument: Record<string, SurveyVersion[]> }> {
  const started = startTiming();
  const actor = await surveyActor();
  const organizations = await allowedOrganizations(actor);
  if (!organizations.length) {
    await logDuration("surveys.list", started, { organizations: 0, surveys: 0 });
    return { organizations, surveys: [], deletableStudyIds: [], deletableInstrumentIds: [], versionsByInstrument: {} };
  }
  const rows = await queryRows<SurveySummary>(`select i.id, s.organization_id,
    o.name as organization_name, s.id as study_id, s.code as study_code,
    s.name as study_name, s.description as study_description,
    i.code, i.name, i.description, i.instrument_type, v.version, v.status,
    coalesce(v.question_count, 0)::int as question_count,
    coalesce(v.observation_count, 0)::int as observation_count,
    i.created_at, creator.display_name as created_by_name, i.metadata,
    v.created_at as version_created_at, v.source_file as version_source_file,
    v.valid_from as version_valid_from, v.valid_to as version_valid_to
    from insight_survey.survey_instruments i
    join insight_survey.survey_studies s on s.id = i.study_id and s.organization_id = i.organization_id
    join insight_core.core_organizations o on o.id = s.organization_id
    left join lateral (
      select iv.version, iv.status, iv.created_at, coalesce(iv.source_file, iv.metadata->>'source_file') as source_file, iv.valid_from, iv.valid_to,
        (select count(*) from insight_survey.survey_questions q where q.instrument_version_id = iv.id) as question_count,
        (select count(*) from insight_survey.survey_observations obs where obs.instrument_version_id = iv.id) as observation_count
      from insight_survey.survey_instrument_versions iv
      where iv.instrument_id = i.id and iv.organization_id = i.organization_id
      order by iv.created_at desc, iv.id desc limit 1
    ) v on true
    left join lateral (
      select p.display_name
      from insight_survey.survey_import_jobs j
      left join insight_core.core_user_profiles p on p.user_id = j.created_by
      where j.id::text = i.metadata->>'import_job_id'
      limit 1
    ) creator on true
    where i.organization_id = any($1::uuid[])
      and not exists (select 1 from insight_survey.survey_import_jobs j
        where j.id::text = i.metadata->>'import_job_id' and j.status <> 'completed')
    order by o.name, s.name, i.name`, [organizations.map((org) => org.id)]);
  const visibility = await visibleSurveyResources(actor, rows);
  const surveys = rows.filter((_, index) => visibility[index]);
  const studyIds = [...new Set(surveys.map((survey) => survey.study_id))];
  const instruments = studyIds.length ? await queryRows<{ id: string; study_id: string; organization_id: string }>(
    `select id, study_id, organization_id from insight_survey.survey_instruments where study_id = any($1::uuid[])`, [studyIds],
  ) : [];
  const [instrumentVisibility, deletePermissions] = await Promise.all([
    visibleSurveyResources(actor, instruments),
    Promise.all(organizations.map(async (org) => {
      if (actor.admin) return true;
      const { data, error } = await actor.supabase.rpc("iam_has_permission", { p_org: org.id, p_code: "survey.delete" });
      return !error && data === true;
    })),
  ]);
  const permittedOrgs = new Set(organizations.filter((_, index) => deletePermissions[index]).map((org) => org.id));
  const deletableInstrumentIds = surveys.filter((survey) => permittedOrgs.has(survey.organization_id)).map((survey) => survey.id);
  const deletableStudyIds = studyIds.filter((studyId) => {
    const related = instruments.filter((instrument) => instrument.study_id === studyId);
    return related.length > 0 && permittedOrgs.has(related[0].organization_id)
      && related.every((instrument) => instrumentVisibility[instruments.indexOf(instrument)]);
  });
  const versionRows = surveys.length ? await queryRows<SurveyVersion & { instrument_id: string }>(`select iv.instrument_id, iv.id, iv.version, iv.name, iv.status,
    (select count(*)::int from insight_survey.survey_questions q where q.instrument_version_id = iv.id) as question_count,
    (select count(*)::int from insight_survey.survey_observations obs where obs.instrument_version_id = iv.id) as observation_count
    from insight_survey.survey_instrument_versions iv
    where iv.instrument_id = any($1::uuid[]) order by iv.created_at desc, iv.id desc`, [surveys.map((survey) => survey.id)]) : [];
  const versionsByInstrument: Record<string, SurveyVersion[]> = {};
  for (const version of versionRows) {
    const { instrument_id, ...data } = version;
    (versionsByInstrument[instrument_id] ??= []).push(data);
  }
  await logDuration("surveys.list", started, { organizations: organizations.length, surveys: surveys.length });
  return { organizations, surveys, deletableStudyIds, deletableInstrumentIds, versionsByInstrument };
}

export async function getSurveyDetail(id: string, selectedVersionId?: string): Promise<SurveyDetail> {
  if (!uuid.test(id)) notFound();
  const actor = await surveyActor();
  const organizations = await allowedOrganizations(actor);
  const organizationIds = organizations.map((org) => org.id);
  if (!organizationIds.length) notFound();
  const rows = await queryRows<SurveySummary>(`select i.id, i.organization_id,
    o.name as organization_name, s.id as study_id, s.code as study_code,
    s.name as study_name, s.description as study_description,
    i.code, i.name, i.description, i.instrument_type, null::text as version, null::text as status,
    0::int as question_count, 0::int as observation_count, i.created_at,
    creator.display_name as created_by_name, i.metadata, null::timestamptz as version_created_at,
    null::text as version_source_file, null::date as version_valid_from, null::date as version_valid_to
    from insight_survey.survey_instruments i
    join insight_survey.survey_studies s on s.id = i.study_id and s.organization_id = i.organization_id
    join insight_core.core_organizations o on o.id = i.organization_id
    left join lateral (
      select p.display_name
      from insight_survey.survey_import_jobs j
      left join insight_core.core_user_profiles p on p.user_id = j.created_by
      where j.id::text = i.metadata->>'import_job_id'
      limit 1
    ) creator on true
    where i.id = $1 and i.organization_id = any($2::uuid[])
      and not exists (select 1 from insight_survey.survey_import_jobs j
        where j.id::text = i.metadata->>'import_job_id' and j.status <> 'completed')`, [id, organizationIds]);
  const survey = rows[0];
  if (!survey || !(await canViewSurveyResource(actor, survey.organization_id, survey.id))) notFound();
  const versions = await queryRows<SurveyVersion>(`select iv.id, iv.version, iv.name, iv.status,
    (select count(*)::int from insight_survey.survey_questions q where q.instrument_version_id = iv.id) as question_count,
    (select count(*)::int from insight_survey.survey_observations obs where obs.instrument_version_id = iv.id) as observation_count
    from insight_survey.survey_instrument_versions iv
    where iv.instrument_id = $1 and iv.organization_id = $2
    order by iv.created_at desc, iv.id desc`, [id, survey.organization_id]);
  if (selectedVersionId && !uuid.test(selectedVersionId)) notFound();
  const current = selectedVersionId ? versions.find((version) => version.id === selectedVersionId) : versions[0];
  if (selectedVersionId && !current) notFound();
  const deletePermission = actor.admin ? null : await actor.supabase.rpc("iam_has_permission", { p_org: survey.organization_id, p_code: "survey.delete" });
  const canDelete = actor.admin || (!deletePermission?.error && deletePermission?.data === true);
  if (!current) return { survey, sections: [], questions: [], versions, canDelete };
  survey.version = current.version;
  survey.status = current.status;
  survey.question_count = current.question_count;
  survey.observation_count = current.observation_count;
  const [sectionsResult, questionsResult, variablesResult, optionsResult] = await Promise.all([
    queryRows<SurveySection>(`select id, code, title, description, position from insight_survey.survey_sections
      where instrument_version_id = $1 and organization_id = $2 order by position, code`, [current.id, survey.organization_id]),
    queryRows<Omit<SurveyQuestion, "variable_codes" | "options">>(`select id, section_id, code, text, question_type, required, position
      from insight_survey.survey_questions where instrument_version_id = $1 and organization_id = $2
      order by position, code`, [current.id, survey.organization_id]),
    queryRows<{ question_id: string; code: string }>(`select v.question_id, v.code from insight_survey.survey_variables v
      join insight_survey.survey_questions q on q.id = v.question_id and q.organization_id = v.organization_id
      where q.instrument_version_id = $1 and v.organization_id = $2 order by v.code`, [current.id, survey.organization_id]),
    queryRows<{ question_id: string; code: string; label: string; value: string }>(`select ao.question_id, ao.code, ao.label, ao.value
      from insight_survey.survey_answer_options ao
      join insight_survey.survey_questions q on q.id = ao.question_id and q.organization_id = ao.organization_id
      where q.instrument_version_id = $1 and ao.organization_id = $2 order by ao.position, ao.code`, [current.id, survey.organization_id]),
  ]);
  return {
    survey, versions, sections: sectionsResult, canDelete,
    questions: questionsResult.map((question) => ({
      ...question,
      variable_codes: variablesResult.filter((row) => row.question_id === question.id).map((row) => row.code),
      options: optionsResult.filter((row) => row.question_id === question.id)
        .map(({ code, label, value }) => ({ code, label, value }))
        .sort((left, right) => surveyOptionCollator.compare(left.value || left.label, right.value || right.label)),
    })),
  };
}

export async function deleteSurveyVersions(instrumentId: string, versionIds: string[], confirmName: string): Promise<{ instrumentDeleted: boolean }> {
  if (!uuid.test(instrumentId) || !Array.isArray(versionIds) || !versionIds.length || versionIds.some((id) => !uuid.test(id))) {
    throw new Error("Selecciona al menos una versión válida para eliminar.");
  }
  const ids = [...new Set(versionIds)];
  if (ids.length !== versionIds.length) throw new Error("La selección de versiones contiene duplicados.");

  const actor = await surveyActor();
  const organizations = await allowedOrganizations(actor);
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout = '5min'");
    const rows = await client.query(`select i.organization_id, i.name
      from insight_survey.survey_instruments i
      where i.id = $1 and i.organization_id = any($2::uuid[])
      for update`, [instrumentId, organizations.map((org) => org.id)]);
    const organizationId = rows.rows[0]?.organization_id as string | undefined;
    if (!organizationId || !(await canViewSurveyResource(actor, organizationId, instrumentId))) {
      throw new Error("No tienes acceso a este cuestionario.");
    }
    if (typeof confirmName !== "string" || confirmName.trim() !== rows.rows[0].name) {
      throw new Error("Escribe el nombre exacto del cuestionario para confirmar.");
    }
    if (!actor.admin) {
      const { data, error } = await actor.supabase.rpc("iam_has_permission", { p_org: organizationId, p_code: "survey.delete" });
      if (error || data !== true) throw new Error("No tienes permiso para eliminar cuestionarios.");
    }
    const versions = await client.query(`select id from insight_survey.survey_instrument_versions
      where instrument_id = $1 and organization_id = $2 for update`, [instrumentId, organizationId]);
    const existingIds = (versions.rows as { id: string }[]).map((version) => version.id);
    if (ids.some((id) => !existingIds.includes(id))) throw new Error("Alguna versión ya no pertenece a este cuestionario.");

    const instrumentDeleted = ids.length === existingIds.length;
    if (instrumentDeleted) {
      await deleteSurveyVersionDataInBatches(client, existingIds, organizationId);
      await client.query("update insight_survey.survey_import_jobs set instrument_id = null where instrument_id = $1 and organization_id = $2", [instrumentId, organizationId]);
      await client.query("delete from insight_survey.survey_instruments where id = $1 and organization_id = $2", [instrumentId, organizationId]);
    } else {
      await deleteSurveyVersionDataInBatches(client, ids, organizationId);
      await client.query("delete from insight_survey.survey_instrument_versions where id = any($1::uuid[]) and instrument_id = $2 and organization_id = $3", [ids, instrumentId, organizationId]);
    }
    await client.query("commit");
    return { instrumentDeleted };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSurveyStudy(studyId: string, confirmName: string): Promise<void> {
  if (!uuid.test(studyId)) throw new Error("Selecciona un estudio válido.");
  const actor = await surveyActor();
  const organizations = await allowedOrganizations(actor);
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout = '5min'");
    const result = await client.query(
      `select organization_id, name, code from insight_survey.survey_studies
       where id = $1 and organization_id = any($2::uuid[]) for update`,
      [studyId, organizations.map((org) => org.id)],
    );
    const study = result.rows[0] as { organization_id: string; name: string; code: string } | undefined;
    if (!study) throw new Error("No tienes acceso a este estudio.");
    if (typeof confirmName !== "string" || confirmName.trim() !== study.name) {
      throw new Error("Escribe el nombre exacto del estudio para confirmar.");
    }
    if (!actor.admin) {
      const { data, error } = await actor.supabase.rpc("iam_has_permission", { p_org: study.organization_id, p_code: "survey.delete" });
      if (error || data !== true) throw new Error("No tienes permiso para eliminar estudios.");
    }
    const instruments = await client.query(
      `select id from insight_survey.survey_instruments where study_id = $1 and organization_id = $2 for update`,
      [studyId, study.organization_id],
    );
    const instrumentRows = instruments.rows as { id: string }[];
    const visibility = await Promise.all(instrumentRows.map((instrument) => canViewSurveyResource(actor, study.organization_id, instrument.id)));
    if (visibility.some((visible) => !visible)) throw new Error("No tienes acceso a todos los instrumentos de este estudio.");
    const active = await client.query(
      `select 1 from insight_survey.survey_import_jobs
       where organization_id = $1 and study_code = $2 and status in ('ready', 'queued', 'processing', 'uploading') limit 1`,
      [study.organization_id, study.code],
    );
    if (active.rowCount) throw new Error("Espera a que terminen o elimina las cargas pendientes de este estudio.");
    const versions = await client.query(
      `select v.id from insight_survey.survey_instrument_versions v
       where v.organization_id = $2 and v.instrument_id = any($1::uuid[]) for update`,
      [instrumentRows.map((instrument) => instrument.id), study.organization_id],
    );
    const versionIds = (versions.rows as { id: string }[]).map((version) => version.id);
    await deleteSurveyVersionDataInBatches(client, versionIds, study.organization_id);
    await client.query(
      `update insight_survey.survey_import_jobs set instrument_id = null
       where organization_id = $1 and instrument_id in
         (select id from insight_survey.survey_instruments where study_id = $2 and organization_id = $1)`,
      [study.organization_id, studyId],
    );
    await client.query(`delete from insight_survey.survey_studies where id = $1 and organization_id = $2`, [studyId, study.organization_id]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSurveyQuestionAnalytics(id: string, selectedVersionId?: string, selectedQuestionId?: string): Promise<SurveyQuestionAnalytics> {
  const detail = await getSurveyDetail(id, selectedVersionId);
  const version = selectedVersionId
    ? detail.versions.find((item) => item.id === selectedVersionId)
    : detail.versions[0];
  if (selectedQuestionId && !uuid.test(selectedQuestionId)) notFound();
  const question = selectedQuestionId
    ? detail.questions.find((item) => item.id === selectedQuestionId)
    : detail.questions[0];
  if (selectedQuestionId && !question) notFound();
  const total = version?.observation_count ?? 0;
  const empty: SurveyQuestionAnalytics = {
    detail, version: version ?? null, question: question ?? null, total, answered: 0, missing: total, distinct: 0,
    average: null, median: null, minimum: null, maximum: null, distribution: [],
  };
  if (!version || !question) return empty;

  const params = [question.id, detail.survey.organization_id, version.id];
  const [summary, distribution] = await Promise.all([
    queryRows<{ answered: number; distinct: number; average: number | null; median: number | null; minimum: number | null; maximum: number | null }>(`with response_values as (
      select r.observation_id, r.is_missing,
        coalesce(ao.label, nullif(btrim(r.value_text), ''), nullif(btrim(r.raw_value), '')) as label,
        coalesce(r.value_decimal, r.value_integer::numeric) as numeric_value
      from insight_survey.survey_variables v
      join insight_survey.survey_responses r on r.variable_id = v.id and r.organization_id = $2
      join insight_survey.survey_observations o on o.id = r.observation_id
        and o.organization_id = $2 and o.instrument_version_id = $3
      left join insight_survey.survey_answer_options ao on ao.id = r.answer_option_id and ao.organization_id = $2
      where v.question_id = $1 and v.organization_id = $2
    )
    select count(distinct observation_id) filter (where not is_missing and label is not null)::int as answered,
      count(distinct label) filter (where not is_missing and label is not null)::int as distinct,
      avg(numeric_value) filter (where not is_missing)::float8 as average,
      percentile_cont(0.5) within group (order by numeric_value::float8)
        filter (where not is_missing and numeric_value is not null) as median,
      min(numeric_value) filter (where not is_missing)::float8 as minimum,
      max(numeric_value) filter (where not is_missing)::float8 as maximum
    from response_values`, params),
    queryRows<{ label: string; count: number }>(`with response_labels as (
      select r.observation_id,
        coalesce(ao.label, nullif(btrim(r.value_text), ''), nullif(btrim(r.raw_value), '')) as response_label
      from insight_survey.survey_variables v
      join insight_survey.survey_responses r on r.variable_id = v.id and r.organization_id = $2
      join insight_survey.survey_observations o on o.id = r.observation_id
        and o.organization_id = $2 and o.instrument_version_id = $3
      left join insight_survey.survey_answer_options ao on ao.id = r.answer_option_id and ao.organization_id = $2
      where v.question_id = $1 and v.organization_id = $2 and not r.is_missing
    )
    select response_label as label, count(distinct observation_id)::int as count
    from response_labels where response_label is not null
    group by response_label order by count desc, response_label limit 12`, params),
  ]);
  const row = summary[0];
  return {
    detail, version, question, total, answered: row?.answered ?? 0,
    missing: Math.max(0, total - (row?.answered ?? 0)),
    distinct: row?.distinct ?? 0,
    average: row?.average ?? null, median: row?.median ?? null,
    minimum: row?.minimum ?? null, maximum: row?.maximum ?? null,
    distribution,
  };
}

export async function getSurveyQuestionResponsePage(id: string, questionId: string, requestedPage: number, selectedVersionId?: string): Promise<SurveyQuestionResponsePage> {
  if (!uuid.test(questionId)) notFound();
  const { survey, versions, questions } = await getSurveyDetail(id, selectedVersionId);
  const version = selectedVersionId ? versions.find((item) => item.id === selectedVersionId) : versions[0];
  const question = questions.find((item) => item.id === questionId);
  if (!version || !question) notFound();

  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(version.observation_count / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1;
  const observations = await queryRows<Pick<SurveyObservation, "id" | "external_id" | "status">>(`select o.id, o.external_id, o.status
    from insight_survey.survey_observations o
    where o.instrument_version_id = $1 and o.organization_id = $2
    order by o.external_id asc nulls last, o.id
    limit $3 offset $4`, [version.id, survey.organization_id, pageSize, (page - 1) * pageSize]);
  const answers = observations.length ? await queryRows<SurveyQuestionResponsePage["answers"][number]>(`select r.observation_id,
    v.id as variable_id, v.code as variable_code, r.raw_value, r.value_text, ao.label as option_label,
    r.is_missing, r.missing_type, r.quality_status
    from insight_survey.survey_responses r
    join insight_survey.survey_variables v on v.id = r.variable_id and v.organization_id = $2 and v.question_id = $3
    left join insight_survey.survey_answer_options ao on ao.id = r.answer_option_id and ao.organization_id = $2
    where r.observation_id = any($1::uuid[]) and r.organization_id = $2
    order by r.observation_id, v.code`, [observations.map((item) => item.id), survey.organization_id, question.id]) : [];
  return { survey, version, question, observations, answers, page, pageCount };
}

const surveyTablePageSizes = new Set([25, 50, 75, 100, 200, 500]);

export async function getSurveyTablePage(id: string, requestedPage: number, requestedPageSize: number, selectedVersionId?: string, selectedRecordId?: string, requestedSortColumn = "record", requestedSortDirection: "asc" | "desc" = "asc"): Promise<SurveyTablePage> {
  const { survey, versions } = await getSurveyDetail(id, selectedVersionId);
  const version = selectedVersionId ? versions.find((item) => item.id === selectedVersionId) : versions[0];
  if (!version) notFound();

  const pageSize = surveyTablePageSizes.has(requestedPageSize) ? requestedPageSize : 25;
  const total = version.observation_count;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const direction = requestedSortDirection === "desc" ? "desc" : "asc";
  const columns = await queryRows<SurveyTablePage["columns"][number]>(`select v.id, q.id as question_id, v.code, q.code as question_code, q.text as question_text
    from insight_survey.survey_variables v
    join insight_survey.survey_questions q on q.id = v.question_id and q.organization_id = $2
    where q.instrument_version_id = $1 and v.organization_id = $2
    order by q.position, q.code, v.code`, [version.id, survey.organization_id]);
  const sortColumn = requestedSortColumn === "status" ? "status" : columns.some((column) => column.id === requestedSortColumn) ? requestedSortColumn : "record";
  const sortVariableId = sortColumn !== "record" && sortColumn !== "status" ? sortColumn : null;
  const sortJoin = sortVariableId ? `left join lateral (
      select coalesce(ao.label, nullif(btrim(r.value_text), ''), nullif(btrim(r.raw_value), '')) as sort_value
      from insight_survey.survey_responses r
      left join insight_survey.survey_answer_options ao on ao.id = r.answer_option_id and ao.organization_id = $2
      where r.observation_id = o.id and r.variable_id = $5 and r.organization_id = $2
      limit 1
    ) response_sort on true` : "";
  const sortOrder = sortColumn === "status"
    ? `o.status ${direction} nulls last, o.external_id asc nulls last, o.id asc`
    : sortVariableId
      ? `case when response_sort.sort_value ~ '^[+-]?[0-9]+([.][0-9]+)?$' then response_sort.sort_value::numeric end ${direction} nulls last, response_sort.sort_value ${direction} nulls last, o.external_id asc nulls last, o.id asc`
      : `case when o.external_id ~ '^[+-]?[0-9]+([.][0-9]+)?$' then o.external_id::numeric end ${direction} nulls last, o.external_id ${direction} nulls last, o.id asc`;
  let page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1;
  if (selectedRecordId) {
    if (!uuid.test(selectedRecordId)) notFound();
    const target = (await queryRows<{ external_id: string | null }>(`select o.external_id
      from insight_survey.survey_observations o
      where o.id = $1 and o.instrument_version_id = $2 and o.organization_id = $3`,
      [selectedRecordId, version.id, survey.organization_id]))[0];
    if (!target) notFound();
    const preceding = (await queryRows<{ position: number }>(`select position from (
        select o.id, row_number() over (order by
          case when o.external_id ~ '^[+-]?[0-9]+([.][0-9]+)?$' then o.external_id::numeric end asc nulls last,
          o.external_id asc nulls last, o.id asc) - 1 as position
        from insight_survey.survey_observations o
        where o.instrument_version_id = $1 and o.organization_id = $2
      ) ordered where id = $3`, [version.id, survey.organization_id, selectedRecordId]))[0]?.position ?? 0;
    page = Math.floor(preceding / pageSize) + 1;
  }
  const observationParams = sortVariableId
    ? [version.id, survey.organization_id, pageSize, (page - 1) * pageSize, sortVariableId]
    : [version.id, survey.organization_id, pageSize, (page - 1) * pageSize];
  const observations = await queryRows<Pick<SurveyObservation, "id" | "external_id" | "status">>(`select o.id, o.external_id, o.status
    from insight_survey.survey_observations o
    ${sortJoin}
    where o.instrument_version_id = $1 and o.organization_id = $2
    order by ${sortOrder}
    limit $3 offset $4`, observationParams);
  const answers = observations.length ? await queryRows<{ observation_id: string; variable_id: string; value: string | null }>(`select r.observation_id,
    v.id as variable_id,
    case when r.is_missing then 'Sin respuesta'
      else coalesce(ao.label, nullif(btrim(r.value_text), ''), nullif(btrim(r.raw_value), ''), 'Sin valor') end as value
    from insight_survey.survey_responses r
    join insight_survey.survey_variables v on v.id = r.variable_id and v.organization_id = $2
    join insight_survey.survey_questions q on q.id = v.question_id and q.organization_id = $2 and q.instrument_version_id = $3
    left join insight_survey.survey_answer_options ao on ao.id = r.answer_option_id and ao.organization_id = $2
    where r.observation_id = any($1::uuid[]) and r.organization_id = $2
    order by r.observation_id, q.position, v.code`, [observations.map((item) => item.id), survey.organization_id, version.id]) : [];
  const valuesByObservation = new Map<string, Record<string, string>>();
  for (const answer of answers) {
    if (!answer.value) continue;
    const values = valuesByObservation.get(answer.observation_id) ?? {};
    values[answer.variable_id] = answer.value;
    valuesByObservation.set(answer.observation_id, values);
  }
  return {
    version,
    columns,
    rows: observations.map((observation) => ({ ...observation, values: valuesByObservation.get(observation.id) ?? {} })),
    page,
    pageSize,
    pageCount,
    total,
    sortColumn,
    sortDirection: direction,
  };
}
