/**
 * Maps aidream `POST /admin/surface-evidence/receives` (W6-A) into what the per-surface admin
 * page's "What the agent receives" section renders: the blocks in delivery order, and the
 * checks as pass / fail / not-checked lines. Pure — tested in __tests__/receives-view.test.ts.
 */
import type { ReceivedBlock, SurfaceReceives } from "@/features/admin/surface-evidence/types";

export type ReceivesCheckState = "pass" | "fail" | "unchecked";

export interface ReceivesCheckLine {
  key: "chain_order" | "raw_blanks" | "not_known";
  label: string;
  state: ReceivesCheckState;
  /** Short reason shown beside the line; null when nothing to add. */
  detail: string | null;
}

export interface ReceivesBlockView {
  key: string;
  id: string;
  label: string;
  /** 1-based position in the order the agent gets the blocks. */
  position: number;
  text: string | null;
  chars: number | null;
  sha256: string | null;
  retained: boolean;
  /** Set when only the hash survived. */
  lostNote: string | null;
  source: string | null;
}

export interface ReceivesView {
  mode: SurfaceReceives["mode"];
  surface: string | null;
  valuesSource: string;
  lastCheckAt: string | null;
  conversationId: string | null;
  messageId: string | null;
  blocks: ReceivesBlockView[];
  checks: ReceivesCheckLine[];
  /** True when the composed request had no values to render (no probe recorded any). */
  noValues: boolean;
  says: string;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function blockView(b: Partial<ReceivedBlock>, i: number): ReceivesBlockView {
  const id = str(b.id) ?? `block-${i + 1}`;
  const text = typeof b.text === "string" ? b.text : null;
  const retained = b.retained !== false && text !== null;
  return {
    key: `${i}:${id}`,
    id,
    label: str(b.label) ?? id,
    position: i + 1,
    text,
    chars: typeof b.chars === "number" ? b.chars : text !== null ? text.length : null,
    sha256: str(b.sha256),
    retained,
    lostNote: retained ? null : (str(b.note) ?? "Only the length and hash were kept."),
    source: str(b.source),
  };
}

function chainOrderLine(data: SurfaceReceives, labelOf: (surface: string) => string): ReceivesCheckLine {
  const label = "Module paragraph before page paragraph";
  const checks = data.checks ?? ({} as SurfaceReceives["checks"]);
  const paragraphs = Array.isArray(checks.paragraphs) ? checks.paragraphs : [];
  if (checks.chain_order_ok === null || checks.chain_order_ok === undefined) {
    return {
      key: "chain_order",
      label,
      state: "unchecked",
      detail: data.mode === "stored" ? "A sent turn keeps no values to check against" : null,
    };
  }
  if (!data.situation) {
    return { key: "chain_order", label, state: "fail", detail: "No situation block" };
  }
  const missing = paragraphs.filter((p) => p.at === null || p.at === undefined);
  if (missing.length) {
    const names = missing.map((p) => (p.level === "page" ? "page" : labelOf(p.surface))).join(", ");
    return { key: "chain_order", label, state: "fail", detail: `Missing: ${names}` };
  }
  if (!checks.chain_order_ok) {
    return { key: "chain_order", label, state: "fail", detail: "Page paragraph comes first" };
  }
  const hasModule = paragraphs.some((p) => p.level === "ancestor");
  return { key: "chain_order", label, state: "pass", detail: hasModule ? null : "Page paragraph only" };
}

function listLine(key: "raw_blanks" | "not_known", label: string, found: string[]): ReceivesCheckLine {
  return {
    key,
    label,
    state: found.length ? "fail" : "pass",
    detail: found.length ? found.join(", ") : null,
  };
}

/** `labelOf` names a surface for a person (the page passes its surface labeler). */
export function mapReceives(data: SurfaceReceives, labelOf: (surface: string) => string = (s) => s): ReceivesView {
  const checks = data.checks ?? ({} as SurfaceReceives["checks"]);
  const blocks = (Array.isArray(data.blocks) ? data.blocks : []).map(blockView);
  return {
    mode: data.mode === "stored" ? "stored" : "composed",
    surface: str(data.surface),
    valuesSource: str(data.values_source) ?? "none",
    lastCheckAt: str(data.last_check_at),
    conversationId: str(data.conversation_id),
    messageId: str(data.message_id),
    blocks,
    checks: [
      chainOrderLine(data, labelOf),
      listLine("raw_blanks", "No raw blanks", strings(checks.raw_blanks).map((b) => `{${b}}`)),
      listLine("not_known", "No “(not known: …)” fills", strings(checks.not_known)),
    ],
    noValues: data.mode !== "stored" && data.values_source === "none",
    says: str(data.says) ?? "",
  };
}

export type ReceivesIdKind = "conversation_id" | "message_id" | "request_id";

/** Whether a failed call means the route is not on the server yet (unknown-route 404). */
export function isRouteNotDeployed(status: number | null | undefined, detail: string | null | undefined): boolean {
  if (status !== 404) return false;
  const d = (detail ?? "").trim().toLowerCase();
  return d === "" || d === "not found" || d.startsWith("http 404");
}
