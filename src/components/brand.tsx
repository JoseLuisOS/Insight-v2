import Image from "next/image";

/** Intersel wordmark, used in nav/header chrome across the app. */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/images/brand/logo-intersel.webp"
        alt="Intersel"
        width={104}
        height={66}
        className="h-6 w-auto"
      />
    </span>
  );
}
