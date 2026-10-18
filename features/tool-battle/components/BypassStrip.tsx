import { ShieldOff } from "lucide-react";
import { Badge } from "@ai-matrx/design-system/controls";

/**
 * Every battle call bypasses all caches, replays and test modes (CONTRACT §5a/§7) and is billed to the
 * Tool Battle cost center (§11). The screen says so, always, in the same place.
 */
export function BypassStrip() {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="note" aria-label="How battle calls run">
      <Badge tone="info" icon={<ShieldOff />}>
        Live calls
      </Badge>
      <Badge>Saved answers off</Badge>
      <Badge>Replay off</Badge>
      <Badge>Test modes off</Badge>
      <Badge>Billed to Tool Battle</Badge>
    </div>
  );
}
