/**
 * THE PER-KIND SETTLE SEAM for Jest (@ai-matrx/rich-content >= 0.2.205, THE COLD-VERDICT RULE per kind).
 *
 * The route publishes "unregistered" only once THIS kind's own lookups have answered (its component
 * read and its definition read: `kindLookupSettled`). In the app the render path asks
 * (`useEnsureKindRenderable`) and the answers repaint the kind. A suite that calls the route directly,
 * or renders statically, asks nothing — so it asks here, the same way the render path does, and
 * waits for the answers. The Jest host answers every read from an empty database
 * (jest.rich-content-host.setup.ts), so a kind nobody seeded settles to "none" — the honest generic
 * floor — and a seeded row or definition still wins.
 */
import { kindLookupSettled } from "@ai-matrx/content-ir/react";
import { matrxKindRouteEnv } from "@ai-matrx/rich-content/kinds/host/route-env";
import { ensureKindRenderable } from "@ai-matrx/rich-content/kinds/react/ensure-kind-renderable";

const SETTLE_LIMIT_MS = 3_000;

export async function settleKindLookups(...kinds: string[]): Promise<void> {
  for (const kind of kinds) ensureKindRenderable(kind);
  const deadline = Date.now() + SETTLE_LIMIT_MS;
  for (;;) {
    const waiting = kinds.filter((kind) => !kindLookupSettled(matrxKindRouteEnv, kind));
    if (waiting.length === 0) return;
    if (Date.now() > deadline) {
      throw new Error(`settleKindLookups: no answer within ${SETTLE_LIMIT_MS}ms for ${waiting.join(", ")}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
