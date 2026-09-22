/**
 * 3D nested-cube loader (adapted from a Uiverse.io concept by reglobby),
 * re-tuned to Intersel's blue scale. Outer cube uses `currentColor` so it
 * adapts to its context (white in a blue button, brand-200 on the dark
 * auth backdrop); the two nested cubes carry the blue "tonalidad" regardless.
 * Pure CSS animation (spin-cubes, globals.css) — respects
 * prefers-reduced-motion via the existing global media query.
 */
export function CubeLoader({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative inline-block [transform-style:preserve-3d] [animation:spin-cubes_1.4s_linear_infinite] ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 border-2 border-current [transform-style:preserve-3d]" />
      <span className="absolute inset-0 border-2 border-brand-300 [transform-style:preserve-3d] [transform:rotateY(45deg)_rotateX(45deg)_scale(0.7)]" />
      <span className="absolute inset-0 border-2 border-brand-200/60 [transform-style:preserve-3d] [transform:rotateY(90deg)_rotateX(90deg)_scale(0.4)]" />
    </div>
  );
}
