const ALLOWED_COMBINING_MARKS = new Set([
  "\u0300", // grave
  "\u0301", // acute
  "\u0302", // circumflex
  "\u0303", // tilde
  "\u0304", // macron
  "\u0306", // breve
  "\u0307", // dot above
  "\u0308", // diaeresis
  "\u030a", // ring
  "\u0328", // ogonek
]);

/** Make a stable, ASCII catalog ID from a display name. Unsupported letters are dropped. */
export function catalogCodeFromName(value: string) {
  const folded = Array.from(value.trim().toLocaleLowerCase("es"), (character) => {
    const decomposed = Array.from(character.normalize("NFD"));
    const [base, ...marks] = decomposed;
    if (marks.length && marks.every((mark) => ALLOWED_COMBINING_MARKS.has(mark)) && /^[a-z]$/.test(base)) return base;
    return character;
  }).join("");

  return folded
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
}

/** Lucide dynamic icon keys use kebab-case; accept either export-style or kebab-style names. */
export function normalizeLucideIconName(value: string) {
  return value.trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLocaleLowerCase("en-US");
}
