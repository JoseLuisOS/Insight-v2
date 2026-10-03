/** Three characters from the first words of a name, with X for missing positions. */
export function threeLetterCode(name: string): string {
  const words = name.normalize("NFKD").replace(/\p{M}/gu, "").toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const value = words.length >= 3
    ? words.slice(0, 3).map((word) => word[0]).join("")
    : words.length === 2
      ? words[0].slice(0, 2) + words[1][0]
      : words[0]?.slice(0, 3) ?? "";
  return value.padStart(3, "X");
}

function series(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

export function surveyCode(prefix: string, studyName: string, sequence: number, instrumentName?: string): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Secuencia de encuesta inválida.");
  const marker = `${series(Math.floor((sequence - 1) / 999))}${(((sequence - 1) % 999) + 1).toString().padStart(3, "0")}`;
  const base = `${prefix}-${threeLetterCode(studyName)}`;
  return instrumentName === undefined
    ? `${base}-${marker}`
    : `${base}-${threeLetterCode(instrumentName)}-${marker}`;
}
