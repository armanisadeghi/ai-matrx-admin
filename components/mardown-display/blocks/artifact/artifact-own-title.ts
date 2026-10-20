import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { getArtifactDef } from "@/features/canvas/artifact-types/artifact-type-registry";

/**
 * Canvas types whose finished card already prints the payload's own title in
 * its header (TimelineBlock, ResearchBlock, ResourceCollectionBlock,
 * TroubleshootingBlock, cookingRecipeDisplay, MultipleChoiceQuiz,
 * ComparisonTableBlock, DecisionTreeBlock, InteractiveDiagramBlock,
 * ProgressTrackerBlock, MathProblemBlock). `ArtifactBlock` drops its own
 * title label for these so the title shows once.
 */
const OWN_TITLE_TYPES: ReadonlySet<string> = new Set([
  "timeline",
  "research",
  "resources",
  "troubleshooting",
  "recipe",
  "quiz",
  "comparison",
  "decision-tree",
  "diagram",
  "progress",
  "math_problem",
]);

/**
 * True when the label above the card would repeat the card's own header: the
 * type prints its payload title and that title is the label's text.
 */
export function artifactTitleRepeatsCard(
  canvasType: string,
  artifactTitle: string,
  payloadTitle: unknown,
): boolean {
  if (!OWN_TITLE_TYPES.has(canvasType)) return false;
  if (typeof payloadTitle !== "string") return false;
  return payloadTitle.trim().toLowerCase() === artifactTitle.trim().toLowerCase();
}

/**
 * True when the title is the placeholder materialization numbers an untitled block with
 * ("Chart 1", "Progress tracker 2" — `titleFor` in planMaterialization): it names nothing the
 * person wrote, so it is never drawn as a label (live 2026-10-19: "Chart 1" sat above a chart
 * whose own header read "RVW visits · Pie chart").
 */
export function isPlaceholderArtifactTitle(canvasType: string, artifactType: string, title: string): boolean {
  const m = /^(.+?) (\d+)$/.exec(title.trim());
  if (!m) return false;
  const label = (m[1] ?? "").toLowerCase();
  const def = getArtifactDef(canvasType);
  const names = new Set([canvasType, artifactType, ...(def?.aliases ?? []), ...(def?.standaloneAliases ?? [])]);
  for (const name of names) {
    if (name && (humanizeIdentifier(name) || name).toLowerCase() === label) return true;
  }
  return false;
}
