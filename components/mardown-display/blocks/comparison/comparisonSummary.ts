/**
 * Which summary tiles a comparison earns. "Items" and "Criteria" are counts and always true.
 * "Avg" is an average of computed scores, and a score means something only when the author gave
 * the block something to score: a rating, a declared cost, or a yes/no. A table of plain text
 * scores every row a neutral 50, so an "Avg 50%" tile is noise and is not drawn (review 3 R14).
 */
export interface SummaryCriterion {
    type?: string;
}

const SCORED_TYPES = new Set(["rating", "cost", "boolean"]);

export function hasMeaningfulScores(criteria: readonly SummaryCriterion[]): boolean {
    return criteria.some((c) => c.type !== undefined && SCORED_TYPES.has(c.type));
}
