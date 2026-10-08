import Link from "next/link";
import { Plus } from "lucide-react";

export function NewChartButton({ label = "Nueva gráfica", variant = "primary" }: { label?: string; variant?: "primary" | "hero" }) {
  return <Link href="/charts/new"
    className={`inline-flex items-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
      variant === "hero" ? "px-5 py-2.5 text-base" : "px-4 py-2 text-sm"}`}>
    <Plus className="size-4" aria-hidden="true" />{label}</Link>;
}
