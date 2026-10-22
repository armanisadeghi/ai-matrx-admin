// `hidden_models` write target: turn what an agent sends (ids, or names the
// way a person reads them, e.g. "ALLaM 2 7B") into catalog ids. Every problem
// in the list is reported at once; a refused ref names the closest current
// models (id + name) so the agent can retry with the right one.

export interface HideableModel {
  id: string;
  name: string;
  common_name?: string | null;
}

const MAX_SUGGESTIONS = 5;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const label = (m: HideableModel) => `${m.common_name || m.name} (${m.id})`;

/** Current models closest to an unknown ref, best first (at most five). */
export function closestModels(ref: string, models: readonly HideableModel[]): HideableModel[] {
  const refNorm = normalize(ref);
  const refTokens = new Set(tokens(ref));
  if (!refNorm) return [];
  const scored = models.map((m) => {
    const names = [m.name, m.common_name ?? ""].filter(Boolean);
    let score = 0;
    for (const n of names) {
      const norm = normalize(n);
      if (!norm) continue;
      if (norm === refNorm) score = Math.max(score, 100);
      else if (refNorm.includes(norm) || norm.includes(refNorm)) score = Math.max(score, 50);
      const shared = tokens(n).filter((t) => refTokens.has(t)).length;
      score = Math.max(score, shared * 10);
    }
    return { m, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name))
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.m);
}

/**
 * Resolve each ref to a current model id: an exact id, else an exact
 * (case-insensitive) name or display name. Throws one error listing every
 * unknown or ambiguous ref.
 */
export function resolveHiddenModelRefs(value: unknown, models: readonly HideableModel[]): string[] {
  if (!Array.isArray(value) || value.some((ref) => typeof ref !== "string"))
    throw new Error("hidden_models expects the full list of models to hide, by id or exact name ([] shows every model).");
  const problems: string[] = [];
  const ids: string[] = [];
  for (const ref of value as string[]) {
    if (models.some((m) => m.id === ref)) {
      ids.push(ref);
      continue;
    }
    const needle = ref.trim().toLowerCase();
    const byName = models.filter(
      (m) => (m.common_name ?? "").toLowerCase() === needle || m.name.toLowerCase() === needle,
    );
    if (byName.length === 1) {
      ids.push(byName[0].id);
    } else if (byName.length > 1) {
      problems.push(`"${ref}" matches ${byName.length} models: ${byName.map(label).join(", ")}. Send the id.`);
    } else {
      const near = closestModels(ref, models);
      problems.push(
        near.length > 0
          ? `"${ref}" is not a current catalog model. Closest: ${near.map(label).join(", ")}.`
          : `"${ref}" is not a current catalog model (by id or exact name), and no current model has a similar name.`,
      );
    }
  }
  if (problems.length > 0) throw new Error(problems.join(" "));
  return ids;
}
