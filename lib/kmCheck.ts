// KM typo guard shared by the trip forms (live hint) and the trip actions
// (the real check). A reading this far above the last one is far more
// likely an extra digit (100072 for 10072) than a real drive.
export const KM_CAUTION_JUMP = 500;

export function fmtKm(n: number): string {
  return `${Math.round(n).toLocaleString("en-NZ")} KM`;
}

/** Non-null when the reading needs a second look before saving. */
export function kmCaution(entered: number, previous: number, kind: "start" | "finish"): string | null {
  if (!Number.isFinite(entered) || !Number.isFinite(previous)) return null;
  const diff = entered - previous;
  if (diff <= KM_CAUTION_JUMP) return null;
  const what = kind === "start" ? "the last recorded reading" : "this trip's starting reading";
  return `${fmtKm(entered)} is ${fmtKm(diff)} more than ${what} (${fmtKm(previous)}). Check for an extra or missing digit.`;
}
