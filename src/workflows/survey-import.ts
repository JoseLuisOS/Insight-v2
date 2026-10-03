const CHUNK_SIZE = 100;

async function prepare(jobId: string): Promise<number> {
  "use step";
  const processor = await import("../../scripts/survey-import-processor");
  return processor.prepareImport(jobId);
}

async function importBlock(jobId: string, index: number): Promise<void> {
  "use step";
  const processor = await import("../../scripts/survey-import-processor");
  await processor.importChunk(jobId, index);
}

async function complete(jobId: string): Promise<void> {
  "use step";
  const processor = await import("../../scripts/survey-import-processor");
  await processor.finishImport(jobId);
}

async function fail(jobId: string, message: string): Promise<void> {
  "use step";
  const processor = await import("../../scripts/survey-import-processor");
  await processor.failImport(jobId, message);
}

export async function surveyImportWorkflow(jobId: string) {
  "use workflow";
  try {
    const records = await prepare(jobId);
    for (let index = 0; index < Math.ceil(records / CHUNK_SIZE); index++) await importBlock(jobId, index);
    await complete(jobId);
  } catch (error) {
    await fail(jobId, error instanceof Error ? error.message : String(error));
    throw error;
  }
}
