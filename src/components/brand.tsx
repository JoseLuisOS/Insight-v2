/**
 * Intersel Insight wordmark. Placeholder until the official Intersel logo asset
 * is provided — drop it into /public and swap the mark here.
 */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold"
      >
        i
      </span>
      <span className="text-foreground">
        Intersel <span className="text-primary">Insight</span>
      </span>
    </span>
  );
}
