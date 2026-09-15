import Link from "next/link";
import { CsvUploader } from "@/components/csv-uploader";

export default function NewDatasetPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/datasets" className="text-sm text-primary hover:underline">
          ← Datasets
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Nuevo dataset</h1>
        <p className="mt-1 text-muted-foreground">
          Sube un CSV o pega una tabla. Inferimos los tipos automáticamente; puedes
          ajustarlos antes de guardar.
        </p>
      </div>
      <CsvUploader />
    </div>
  );
}
