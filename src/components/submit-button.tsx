"use client";

import { useFormStatus } from "react-dom";
import { CubeLoader } from "@/components/cube-loader";

/**
 * Submit button that shows a pending label while its parent <form action={...}>
 * is in flight. Must be rendered as a descendant of the <form> (useFormStatus
 * reads the nearest parent form's status), so it's a separate Client Component
 * from the (Server Component) page/form around it.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2.5">
          <CubeLoader size={16} />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
