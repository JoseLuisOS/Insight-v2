import { DataNetworkCanvas } from "@/components/data-network-canvas";

/**
 * Shared dark/premium background for the auth surfaces (login, change
 * password, request access) — gradient + ambient glow + dot grid + the live
 * data-network canvas. Pure CSS layers render server-side; only the canvas
 * itself is a Client Component.
 */
export function AuthBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_20%_-10%,#1f4e8f_0%,#0c1c38_45%,#050b18_100%)]" />

      <div className="pointer-events-none absolute -left-48 top-[-15%] h-[32rem] w-[32rem] animate-[drift-a_22s_ease-in-out_infinite] rounded-full bg-brand-500/30 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-12%] top-[15%] h-[38rem] w-[38rem] animate-[drift-b_26s_ease-in-out_infinite] rounded-full bg-brand-300/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[25%] h-[28rem] w-[28rem] animate-[drift-c_20s_ease-in-out_infinite] rounded-full bg-sky-400/15 blur-[130px]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <DataNetworkCanvas className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
    </>
  );
}
