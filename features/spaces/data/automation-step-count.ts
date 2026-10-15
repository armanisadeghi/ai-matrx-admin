/** The step numbering the visual editor and the engine share (pure, so a test can load it without the editor's UI). */

/** One step as the editor holds it: the engine's own shape, read loosely because groups carry any kind inside. */
export type Step = { do: string } & Record<string, unknown>;

const arr = (v: unknown): Step[] => (Array.isArray(v) ? (v as Step[]) : []);

/** How many numbered steps a step is: itself and everything inside it, as the engine numbers them. */
export function stepCount(s: Step): number {
  if (s.do === "if") return 1 + arr(s.else).reduce((n, x) => n + stepCount(x), 0) + (Array.isArray(s.branches) ? (s.branches as Array<{ actions?: Step[] }>).reduce((n, b) => n + arr(b.actions).reduce((m, x) => m + stepCount(x), 0), 0) : 0);
  if (s.do === "for_each") return 1 + arr(s.actions).reduce((n, x) => n + stepCount(x), 0);
  return 1;
}
