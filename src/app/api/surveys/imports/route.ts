import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { cancelSurveyImportUpload, createSurveyImportUpload, DuplicateSurveyVersionError, queueSurveyImportJob, setSurveyImportRunId, validateSurveyImportUpload } from "@/lib/insight-survey-imports";
import { surveyImportWorkflow } from "@/workflows/survey-import";

export const runtime = "nodejs";

function failure(error: unknown) {
  if (error instanceof DuplicateSurveyVersionError) return NextResponse.json({
    error: error.message, existing_version: error.version,
    existing_instrument_id: error.instrumentId, existing_job_id: error.jobId,
  }, { status: 409 });
  const message = error instanceof Error ? error.message : "No se pudo importar el archivo.";
  const expected = /^(Inicia sesión|No tienes acceso|No puedes importar|Los nombres|La versión|La organización|La secuencia|Ya hay una importación|Selecciona|Formato|El archivo|Faltan|Encabezado|Valor inválido|ID vacío|Archivo delimitado|Hoja de cálculo|JSON|Pregunta|Respuesta|Tipo de pregunta|Opciones|Ese código|Ya existe|Importación|La importación|Revisa|No se encontró|No se pudo|Falta configurar|El almacenamiento)/.test(message);
  if (!expected) console.error("Error al importar encuesta", error);
  return NextResponse.json({ error: expected ? message : "No se pudo importar el archivo." }, { status: expected ? 400 : 500 });
}

export async function POST(request: Request) {
  try { return NextResponse.json(await createSurveyImportUpload(await request.json()), { status: 201 }); }
  catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await validateSurveyImportUpload(String(body.id ?? "")));
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    await cancelSurveyImportUpload(String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const mapping = body.column_mapping && typeof body.column_mapping === "object" && !Array.isArray(body.column_mapping)
      ? body.column_mapping as Record<string, number> : {};
    await queueSurveyImportJob(id, body.confirm_warnings === true, mapping);
    const run = await start(surveyImportWorkflow, [id]);
    await setSurveyImportRunId(id, run.runId);
    return NextResponse.json({ ok: true, run_id: run.runId });
  } catch (error) { return failure(error); }
}
