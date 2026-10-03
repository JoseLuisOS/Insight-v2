import "server-only";
import { notFound, redirect } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { createClient } from "@/lib/supabase/server";
import { isSysadmin, userCatalogAccess } from "@/lib/insight-catalog";

export type SurveyOrganization = { id: string; name: string };
export type SurveySummary = {
  id: string;
  organization_id: string;
  organization_name: string;
  study_code: string;
  study_name: string;
  code: string;
  name: string;
  description: string | null;
  version: string | null;
  status: string | null;
  question_count: number;
  observation_count: number;
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
export type SurveyDetail = { survey: SurveySummary; sections: SurveySection[]; questions: SurveyQuestion[]; versions: SurveyVersion[] };
export type SurveyObservation = { id: string; external_id: string | null; status: string; answer_count: number };
export type SurveyAnswer = {
  question_code: string; question_text: string; variable_code: string;
  raw_value: string | null; value_text: string | null; option_label: string | null;
  is_missing: boolean; missing_type: string | null; quality_status: string;
};
export type SurveyResponsePage = {
  survey: SurveySummary; version: SurveyVersion | null; observations: SurveyObservation[];
  page: number; pageCount: number; search: string; selected: SurveyObservation | null;
  answers: SurveyAnswer[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function queryRows<T>(sql: string, params: unknown[]): Promise<T[]> {
  const result = await insightDb().query(sql, params);
  return result.rows as T[];
}

async function surveyActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
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

async function canViewResource(actor: Awaited<ReturnType<typeof surveyActor>>, organizationId: string, instrumentId: string) {
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

export async function listSurveys(): Promise<{ organizations: SurveyOrganization[]; surveys: SurveySummary[] }> {
  const actor = await surveyActor();
  const organizations = await allowedOrganizations(actor);
  if (!organizations.length) return { organizations, surveys: [] };
  const rows = await queryRows<SurveySummary>(`select i.id, s.organization_id,
    o.name as organization_name, s.code as study_code, s.name as study_name,
    i.code, i.name, i.description, v.version, v.status,
    coalesce(v.question_count, 0)::int as question_count,
    coalesce(v.observation_count, 0)::int as observation_count
    from insight_survey.survey_instruments i
    join insight_survey.survey_studies s on s.id = i.study_id and s.organization_id = i.organization_id
    join insight_core.core_organizations o on o.id = s.organization_id
    left join lateral (
      select iv.version, iv.status,
        (select count(*) from insight_survey.survey_questions q where q.instrument_version_id = iv.id) as question_count,
        (select count(*) from insight_survey.survey_observations obs where obs.instrument_version_id = iv.id) as observation_count
      from insight_survey.survey_instrument_versions iv
      where iv.instrument_id = i.id and iv.organization_id = i.organization_id
      order by iv.created_at desc, iv.id desc limit 1
    ) v on true
    where i.organization_id = any($1::uuid[])
      and not exists (select 1 from insight_survey.survey_import_jobs j
        where j.id::text = i.metadata->>'import_job_id' and j.status <> 'completed')
    order by o.name, s.name, i.name`, [organizations.map((org) => org.id)]);
  const visibility = await Promise.all(rows.map((row) => canViewResource(actor, row.organization_id, row.id)));
  return { organizations, surveys: rows.filter((_, index) => visibility[index]) };
}

export async function getSurveyDetail(id: string): Promise<SurveyDetail> {
  if (!uuid.test(id)) notFound();
  const actor = await surveyActor();
  const organizations = await allowedOrganizations(actor);
  const organizationIds = organizations.map((org) => org.id);
  if (!organizationIds.length) notFound();
  const rows = await queryRows<SurveySummary>(`select i.id, i.organization_id,
    o.name as organization_name, s.code as study_code, s.name as study_name,
    i.code, i.name, i.description, null::text as version, null::text as status,
    0::int as question_count, 0::int as observation_count
    from insight_survey.survey_instruments i
    join insight_survey.survey_studies s on s.id = i.study_id and s.organization_id = i.organization_id
    join insight_core.core_organizations o on o.id = i.organization_id
    where i.id = $1 and i.organization_id = any($2::uuid[])
      and not exists (select 1 from insight_survey.survey_import_jobs j
        where j.id::text = i.metadata->>'import_job_id' and j.status <> 'completed')`, [id, organizationIds]);
  const survey = rows[0];
  if (!survey || !(await canViewResource(actor, survey.organization_id, survey.id))) notFound();
  const versions = await queryRows<SurveyVersion>(`select iv.id, iv.version, iv.name, iv.status,
    (select count(*)::int from insight_survey.survey_questions q where q.instrument_version_id = iv.id) as question_count,
    (select count(*)::int from insight_survey.survey_observations obs where obs.instrument_version_id = iv.id) as observation_count
    from insight_survey.survey_instrument_versions iv
    where iv.instrument_id = $1 and iv.organization_id = $2
    order by iv.created_at desc, iv.id desc`, [id, survey.organization_id]);
  const current = versions[0];
  if (!current) return { survey, sections: [], questions: [], versions };
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
    survey, versions, sections: sectionsResult,
    questions: questionsResult.map((question) => ({
      ...question,
      variable_codes: variablesResult.filter((row) => row.question_id === question.id).map((row) => row.code),
      options: optionsResult.filter((row) => row.question_id === question.id).map(({ code, label, value }) => ({ code, label, value })),
    })),
  };
}

export async function getSurveyResponsePage(id: string, requestedPage: number, search: string, selectedId?: string): Promise<SurveyResponsePage> {
  const detail = await getSurveyDetail(id);
  const { survey, versions } = detail;
  const version = versions[0] ?? null;
  const normalizedSearch = search.trim().slice(0, 120);
  const pageSize = 25;
  const empty = { survey, version, observations: [], page: 1, pageCount: 1, search: normalizedSearch, selected: null, answers: [] };
  if (!version) return empty;
  const matchingCount = normalizedSearch ? (await queryRows<{ count: number }>(`select count(*)::int as count
    from insight_survey.survey_observations o
    where o.instrument_version_id = $1 and o.organization_id = $2 and o.external_id = $3`,
    [version.id, survey.organization_id, normalizedSearch]))[0].count : version.observation_count;
  const pageCount = Math.max(1, Math.ceil(matchingCount / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1;
  const observations = await queryRows<SurveyObservation>(`select o.id, o.external_id, o.status,
    (select count(*)::int from insight_survey.survey_responses r where r.observation_id = o.id) as answer_count
    from insight_survey.survey_observations o
    where o.instrument_version_id = $1 and o.organization_id = $2
      and ($3::text = '' or o.external_id = $3)
    order by o.external_id asc nulls last, o.id
    limit $4 offset $5`, [version.id, survey.organization_id, normalizedSearch, pageSize, (page - 1) * pageSize]);
  if (!selectedId || !uuid.test(selectedId)) return { ...empty, observations, page, pageCount };
  const selected = (await queryRows<SurveyObservation>(`select o.id, o.external_id, o.status,
    (select count(*)::int from insight_survey.survey_responses r where r.observation_id = o.id) as answer_count
    from insight_survey.survey_observations o
    where o.id = $1 and o.instrument_version_id = $2 and o.organization_id = $3`,
    [selectedId, version.id, survey.organization_id]))[0] ?? null;
  if (!selected) notFound();
  const answers = await queryRows<SurveyAnswer>(`select q.code as question_code, q.text as question_text,
    v.code as variable_code, r.raw_value, r.value_text, ao.label as option_label,
    r.is_missing, r.missing_type, r.quality_status
    from insight_survey.survey_responses r
    join insight_survey.survey_variables v on v.id = r.variable_id and v.organization_id = $2
    join insight_survey.survey_questions q on q.id = v.question_id and q.organization_id = $2 and q.instrument_version_id = $3
    left join insight_survey.survey_answer_options ao on ao.id = r.answer_option_id and ao.organization_id = $2
    where r.observation_id = $1 and r.organization_id = $2
    order by q.position, q.code, v.code`, [selected.id, survey.organization_id, version.id]);
  return { survey, version, observations, page, pageCount, search: normalizedSearch, selected, answers };
}
