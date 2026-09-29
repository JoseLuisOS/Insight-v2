import { catalogMutation } from "@/lib/insight-catalog-api";

export async function POST(request: Request) { return catalogMutation(request, "group"); }
