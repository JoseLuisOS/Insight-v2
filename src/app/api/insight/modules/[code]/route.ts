import { catalogMutation } from "@/lib/insight-catalog-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return catalogMutation(request, "module", code);
}
