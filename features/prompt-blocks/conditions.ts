/** The variant condition grammar (v1): provider, model/alias, latest, reasoning. First match wins. */

export const REASONING_LEVELS = ["none", "minimal", "low", "medium", "high", "max", "auto", "unset"] as const;

export interface BlockCondition {
  provider?: string[];
  model?: string[];
  latest?: boolean;
  reasoning?: string[];
}

export function parseCondition(value: unknown): BlockCondition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const list = (x: unknown): string[] | undefined =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === "string" && i.trim() !== "") : undefined;
  const out: BlockCondition = {};
  const provider = list(v.provider);
  if (provider?.length) out.provider = provider;
  const model = list(v.model);
  if (model?.length) out.model = model;
  if (v.latest === true) out.latest = true;
  const reasoning = list(v.reasoning);
  if (reasoning?.length) out.reasoning = reasoning;
  return out;
}

/** `{}` never matches: a variant must say when it applies. */
export function isEmptyCondition(c: BlockCondition): boolean {
  return !c.provider?.length && !c.model?.length && !c.latest && !c.reasoning?.length;
}

export function describeCondition(c: BlockCondition): string {
  if (isEmptyCondition(c)) return "Never (no condition set)";
  const parts: string[] = [];
  if (c.provider?.length) parts.push(c.provider.join(" or "));
  if (c.model?.length) parts.push(c.model.join(" or "));
  if (c.latest) parts.push("latest model");
  if (c.reasoning?.length) parts.push(`reasoning ${c.reasoning.join(" or ")}`);
  return parts.join(" + ");
}

/** The jsonb to store: only keys that carry something. */
export function conditionToJson(c: BlockCondition): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.provider?.length) out.provider = c.provider;
  if (c.model?.length) out.model = c.model;
  if (c.latest) out.latest = true;
  if (c.reasoning?.length) out.reasoning = c.reasoning;
  return out;
}
