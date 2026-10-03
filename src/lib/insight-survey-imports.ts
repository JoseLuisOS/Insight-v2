import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insightDb } from "@/lib/insight-db";
import { isSysadmin, userCatalogAccess } from "@/lib/insight-catalog";
import { surveyCode } from "@/lib/survey-codes";
import { applyColumnMapping, formatOf, parseSurveyFile } from "../../scripts/survey-file";

export const SURVEY_IMPORT_BUCKET = "survey-imports";
export const SURVEY_IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export type SurveyImportJob = {
  id: string; organization_id: string; organization_name: string; study_code: string; version: string;
  instrument_code: string; instrument_name: string; source_filename: string;
  preview: { format: string; sheet: string | null; records: number; questions: number; responses: number; warnings: string[];
    columns: { code: string; label: string; position: number; questionType: string; samples: string[] }[] };
  status: string; error_message: string | null; instrument_id: string | null; created_at: string;
  workflow_run_id: string | null; column_mapping: Record<string, number>;
};
export type SurveyImportOrganization = { id: string; name: string; code_prefix: string };

export class DuplicateSurveyVersionError extends Error {
  constructor(
    public readonly version: string,
    public readonly instrumentId: string | null,
    public readonly jobId: string | null = null,
  ) {
    super(`La versión ${Number.parseInt(version, 10)} de esta encuesta ya existe. Revísala o cambia a la versión ${Number.parseInt(version, 10) + 1}.`);
  }
}

async function importActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión para importar encuestas.");
  const admin = await isSysadmin(user.id);
  if (!(await userCatalogAccess(user.id, admin)).has("encuestas")) throw new Error("No tienes acceso a Encuestas.");
  return { supabase, userId: user.id, admin };
}

async function createOrganizations(actor: Awaited<ReturnType<typeof importActor>>): Promise<SurveyImportOrganization[]> {
  const result = await insightDb().query(`select o.id, o.name, o.code_prefix from insight_core.core_organizations o
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

async function authorizedOrganization(organizationId: string) {
  const actor = await importActor();
  const organizations = await createOrganizations(actor);
  if (!organizations.some((org) => org.id === organizationId)) throw new Error("No puedes importar encuestas para esta organización.");
  return actor;
}

export async function getSurveyImportWorkspace() {
  const actor = await importActor();
  const organizations = await createOrganizations(actor);
  if (!organizations.length) return { organizations, jobs: [] as SurveyImportJob[] };
  const result = await insightDb().query(`select j.id, j.organization_id, o.name as organization_name,
    j.study_code, j.instrument_code, j.instrument_name, j.version, j.source_filename, j.preview,
    j.status, j.error_message, j.instrument_id, j.created_at, j.workflow_run_id, j.column_mapping
    from insight_survey.survey_import_jobs j
    join insight_core.core_organizations o on o.id = j.organization_id
    where j.organization_id = any($1::uuid[])
    order by j.created_at desc limit 50`, [organizations.map((org) => org.id)]);
  return { organizations, jobs: result.rows as SurveyImportJob[] };
}

async function ensureBucket() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Falta configurar el servicio de almacenamiento privado.");
  const admin = createAdminClient();
  const existing = await admin.storage.getBucket(SURVEY_IMPORT_BUCKET);
  if (!existing.error) {
    if (existing.data.public) throw new Error("El almacenamiento de encuestas debe ser privado.");
    return admin;
  }
  const created = await admin.storage.createBucket(SURVEY_IMPORT_BUCKET, { public: false, fileSizeLimit: "10MB" });
  if (created.error && !/already exists/i.test(created.error.message)) throw new Error(`No se pudo preparar el almacenamiento: ${created.error.message}`);
  return admin;
}

export async function createSurveyImportUpload(input: Record<string, unknown>) {
  const organizationId = String(input.organization_id ?? "");
  const actor = await authorizedOrganization(organizationId);
  const studyName = String(input.study_name ?? "").trim();
  const instrumentName = String(input.instrument_name ?? "").trim();
  if (studyName.length < 2 || studyName.length > 150 || instrumentName.length < 2 || instrumentName.length > 150) throw new Error("Los nombres deben tener entre 2 y 150 caracteres.");
  const majorVersion = input.version;
  if (!Number.isSafeInteger(majorVersion) || (majorVersion as number) < 1 || (majorVersion as number) > 9999) throw new Error("La versión debe ser un entero entre 1 y 9999.");
  const version = `${majorVersion}.0`;
  const filename = String(input.filename ?? "").trim();
  const size = Number(input.size);
  formatOf(filename);
  if (filename.length > 200 || !Number.isSafeInteger(size) || size < 1 || size > SURVEY_IMPORT_MAX_BYTES) {
    throw new Error("Selecciona un archivo admitido de hasta 10 MB.");
  }
  const id = randomUUID();
  const storagePath = `${organizationId}/${id}/${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const admin = await ensureBucket();
  const signed = await admin.storage.from(SURVEY_IMPORT_BUCKET).createSignedUploadUrl(storagePath);
  if (signed.error) throw new Error(`No se pudo autorizar la subida: ${signed.error.message}`);
  const client = await insightDb().connect();
  let studyCode: string;
  let instrumentCode: string;
  try {
    await client.query("begin");
    const organization = await client.query(`select code_prefix from insight_core.core_organizations
      where id = $1 and status = 'active' for update`, [organizationId]);
    if (!organization.rows.length) throw new Error("La organización ya no está activa.");
    const prefix = organization.rows[0].code_prefix as string;
    const studies = await client.query(`select id, code from insight_survey.survey_studies
      where organization_id = $1 and lower(btrim(name)) = lower($2)
      order by created_at, id limit 1`, [organizationId, studyName]);
    const study = studies.rows[0] as { id: string; code: string } | undefined;
    await client.query(`update insight_survey.survey_import_jobs
      set status = 'failed', error_message = 'La subida caducó antes de validar el archivo.', updated_at = now()
      where organization_id = $1 and status = 'uploading' and created_at < now() - interval '1 hour'`, [organizationId]);
    const activeJobs = await client.query(`select id, instrument_name, version from insight_survey.survey_import_jobs
      where organization_id = $1 and lower(btrim(study_name)) = lower($2)
        and status in ('uploading','ready','queued','processing')`, [organizationId, studyName]);
    const pendingDuplicate = activeJobs.rows.find((job: { id: string; instrument_name: string; version: string }) => job.version === version && job.instrument_name.trim().toLocaleLowerCase("es") === instrumentName.toLocaleLowerCase("es"));
    if (pendingDuplicate) throw new DuplicateSurveyVersionError(version, null, pendingDuplicate.id);
    if (!study && activeJobs.rows.length) throw new Error("Ya hay una importación en curso para este estudio. Termínala antes de cargar otro instrumento.");
    const instruments = study ? await client.query(`select id, code from insight_survey.survey_instruments
      where study_id = $1 and lower(btrim(name)) = lower($2) order by created_at, id limit 1`, [study.id, instrumentName]) : null;
    const instrument = instruments?.rows[0] as { id: string; code: string } | undefined;
    if (instrument) {
      const duplicate = await client.query(`select id from insight_survey.survey_instrument_versions
        where instrument_id = $1 and version = $2 limit 1`, [instrument.id, version]);
      if (duplicate.rows.length) throw new DuplicateSurveyVersionError(version, instrument.id);
    }
    await client.query(`insert into insight_survey.survey_code_sequences (organization_id)
      values ($1) on conflict (organization_id) do nothing`, [organizationId]);
    const next = await client.query(`update insight_survey.survey_code_sequences
      set study_last = study_last + $2, instrument_last = instrument_last + $3
      where organization_id = $1 returning study_last, instrument_last`, [organizationId, study ? 0 : 1, instrument ? 0 : 1]);
    studyCode = study?.code ?? surveyCode(prefix, studyName, Number(next.rows[0].study_last));
    instrumentCode = instrument?.code ?? surveyCode(prefix, studyName, Number(next.rows[0].instrument_last), instrumentName);
    await client.query(`insert into insight_survey.survey_import_jobs
      (id, organization_id, created_by, study_code, study_name, instrument_code, instrument_name,
        version, source_filename, storage_path, status)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'uploading')`,
      [id, organizationId, actor.userId, studyCode, studyName, instrumentCode, instrumentName,
        version, filename, storagePath]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
  return { id, path: storagePath, token: signed.data.token, study_code: studyCode, instrument_code: instrumentCode, version };
}

async function importJobForUser(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Importación inválida.");
  const row = await insightDb().query(`select * from insight_survey.survey_import_jobs where id = $1`, [id]);
  if (!row.rows.length) throw new Error("Importación no encontrada.");
  await authorizedOrganization(row.rows[0].organization_id);
  return row.rows[0];
}

export async function cancelSurveyImportUpload(id: string) {
  const job = await importJobForUser(id);
  const actor = await importActor();
  if (!actor.admin && job.created_by !== actor.userId) throw new Error("No puedes cancelar la subida de otro usuario.");
  await insightDb().query(`update insight_survey.survey_import_jobs
    set status = 'failed', error_message = 'No se completó la subida o validación del archivo.', updated_at = now()
    where id = $1 and status = 'uploading'`, [job.id]);
}

async function uploadedBytes(job: { storage_path: string; source_filename: string }) {
  const admin = await ensureBucket();
  const downloaded = await admin.storage.from(SURVEY_IMPORT_BUCKET).download(job.storage_path);
  if (downloaded.error || !downloaded.data) throw new Error("No se encontró el archivo subido.");
  if (downloaded.data.size < 1 || downloaded.data.size > SURVEY_IMPORT_MAX_BYTES) throw new Error("El archivo supera el máximo de 10 MB.");
  return Buffer.from(await downloaded.data.arrayBuffer());
}

export async function validateSurveyImportUpload(id: string) {
  const job = await importJobForUser(id);
  if (job.status !== "uploading") throw new Error("El archivo ya fue validado o la importación se inició.");
  const buffer = await uploadedBytes(job);
  const parsed = await parseSurveyFile(buffer, job.source_filename);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const updated = await insightDb().query(`update insight_survey.survey_import_jobs
    set source_sha256 = $2, preview = $3::jsonb, status = 'ready', updated_at = now()
    where id = $1 and status = 'uploading' returning id`, [id, sha256, JSON.stringify(parsed.preview)]);
  if (!updated.rows.length) throw new Error("La importación cambió durante la validación.");
  return parsed.preview;
}

export async function queueSurveyImportJob(id: string, confirmWarnings: boolean, mapping: Record<string, number>) {
  const job = await importJobForUser(id);
  if (job.status === "queued" && !job.workflow_run_id) return { id };
  if (job.status !== "ready") throw new Error("La importación ya se inició o terminó.");
  if (job.preview.warnings?.length && !confirmWarnings) throw new Error("Revisa y confirma las advertencias antes de importar.");
  const buffer = await uploadedBytes(job);
  if (createHash("sha256").update(buffer).digest("hex") !== job.source_sha256) throw new Error("El archivo cambió desde la validación.");
  applyColumnMapping(await parseSurveyFile(buffer, job.source_filename), mapping);
  const updated = await insightDb().query(`update insight_survey.survey_import_jobs
    set status = 'queued', column_mapping = $2::jsonb, updated_at = now()
    where id = $1 and status = 'ready' returning id`, [id, JSON.stringify(mapping)]);
  if (!updated.rows.length) throw new Error("La importación ya se inició.");
  return { id };
}

export async function setSurveyImportRunId(id: string, runId: string) {
  await insightDb().query(`update insight_survey.survey_import_jobs
    set workflow_run_id = $2, updated_at = now() where id = $1 and workflow_run_id is null`, [id, runId]);
}
