/**
 * Plain markdown for a structured block, so "Save to notes" keeps what the block said — the
 * decision paths, the comparison grid — as a real note instead of dropping it with the answer.
 * Pure: no React, no store.
 */
import type { DecisionNode, DecisionTreeData } from "@/components/mardown-display/blocks/decision-tree/parseDecisionTreeJSON";
import type { ComparisonTableData } from "@/components/mardown-display/blocks/comparison/parseComparisonJSON";

function nodeLines(node: DecisionNode | undefined, depth: number, branch: string | null): string[] {
  if (!node) return [];
  const pad = "  ".repeat(depth);
  const text = (node.question ?? node.action ?? node.description ?? "").trim();
  const label = node.question ? text : node.action ? `**Do:** ${text}` : text;
  const lead = branch ? `**${branch}** → ` : "";
  const lines = [`${pad}- ${lead}${label}`];
  if (node.question && node.description) lines.push(`${pad}  _${node.description.trim()}_`);
  lines.push(...nodeLines(node.yes, depth + 1, "Yes"), ...nodeLines(node.no, depth + 1, "No"));
  return lines;
}

export function decisionTreeToMarkdown(tree: DecisionTreeData): string {
  const head = [`# ${tree.title}`.trim(), tree.description ? `\n${tree.description}` : ""].join("");
  return `${head}\n\n${nodeLines(tree.root, 0, null).join("\n")}\n`;
}

const cell = (v: unknown): string => String(v ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();

export function comparisonToMarkdown(c: ComparisonTableData): string {
  const items = c.items ?? [];
  const header = `| Item | ${c.criteria.map((k) => cell(k.name)).join(" | ")} |`;
  const rule = `| --- | ${c.criteria.map(() => "---").join(" | ")} |`;
  const rows = items.map(
    (item, i) => `| ${cell(item)} | ${c.criteria.map((k) => cell((k.values ?? [])[i])).join(" | ")} |`,
  );
  const head = [`# ${c.title}`.trim(), c.description ? `\n${c.description}` : ""].join("");
  return `${head}\n\n${[header, rule, ...rows].join("\n")}\n`;
}
