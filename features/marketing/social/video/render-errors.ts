/**
 * Plain words for a failed video job. The server sends a typed code (and a person-readable `user_message` when it has
 * one); a raw cloud/engine message (an ARN, an exception name, an install hint) is never shown to the person.
 */

import { BackendApiError } from "@ai-matrx/api";

const TECHNICAL = /(arn:|aws|accessdenied|exception|traceback|ecs:|npm |esbuild|node_modules|\.py\b|\.ts\b|errno|stack)/i;

const BY_CODE: Record<string, string> = {
  local_render_disabled: "The local render server is turned off. Render with the render fleet.",
  unknown_renderer: "That renderer isn't available. Pick another one.",
  wrong_organization: "This video belongs to another organization. Switch organization, then try again.",
  organization_required: "Pick an organization first, then try again.",
  render_fleet_unavailable: "The render fleet isn't available right now. Try again in a moment.",
  render_unavailable: "Rendering isn't available right now. Try again in a moment.",
  render_failed: "The render didn't finish. Try again.",
  engine_unavailable: "The video engine isn't ready on the server yet. Try again in a moment.",
  clone_plan_failed: "The clone could not be planned. Nothing was generated.",
  forbidden: "You can't change this video.",
  not_found: "This video wasn't found.",
};

const GENERIC = "That didn't finish. Try again.";

/** The words a person sees for a typed code + the server's message. */
export function plainRenderMessage(code: string | null | undefined, message?: string | null): string {
  const m = (message ?? "").trim();
  const plain = m && !TECHNICAL.test(m) && m.length <= 200 ? m : null;
  // A failed render says WHY: the server's plain reason (a take that needs regenerating, a clip it cannot read) wins over
  // the generic "didn't finish"; any other code keeps its fixed words.
  if (code === "render_failed" && plain) return plain;
  const mapped = code ? BY_CODE[code] : undefined;
  if (mapped) return mapped;
  return plain ?? GENERIC;
}

/** Code + message out of whatever was thrown (stream refusal, HTTP refusal, plain Error). */
export function plainFailureText(error: unknown): string {
  if (error instanceof BackendApiError) {
    const d = (error.details ?? {}) as { code?: unknown; message?: unknown; detail?: { code?: unknown; message?: unknown } };
    const inner = d.detail && typeof d.detail === "object" ? d.detail : d;
    const code = typeof inner.code === "string" ? inner.code : typeof d.code === "string" ? d.code : null;
    const msg = typeof inner.message === "string" ? inner.message : typeof d.message === "string" ? d.message : null;
    return plainRenderMessage(code, msg);
  }
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : null;
  return plainRenderMessage(typeof code === "string" ? code : null, message);
}
