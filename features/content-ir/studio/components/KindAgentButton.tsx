"use client";

/**
 * KindAgentButton — the one seam that hands a kind + a specific part to the
 * agent BOUND TO THE SURFACE it is dropped on. Droppable next to any
 * doctor-row part, on the admin kind registry and in the /shapes studio.
 *
 * It launches a surface agent ROLE through `useKindAgentLaunch`, so the run
 * arrives with the page's live surface scope AND the composed brief on the
 * agent's declared variables, in a floating window on the current page — the
 * user watches every kind_* tool call stream without leaving the registry.
 * Loud when the role has no agent — never a silent no-op.
 */

import { useState } from "react";
import { PencilRuler } from "lucide-react";
import { Button } from "@ai-matrx/design-system";
import { ADMIN_KIND_REGISTRY_SURFACE_NAME } from "@/features/surfaces/manifests/admin-kind-registry.manifest";
import { useKindAgentLaunch } from "@/features/content-ir/studio/useKindAgentLaunch";
import type { KindAgentIntentInput } from "@/features/content-ir/studio/kind-agent-intents";
import { loadKindEditSeed } from "@/features/content-ir/studio/kind-edit-seed";

/** Where this button lives by default: the admin kind registry's own role. */
const ADMIN_KIND_EDITOR_ROLE = "kind_editor";

interface KindAgentButtonProps extends KindAgentIntentInput {
  label: string;
  /** Button text (defaults per part elsewhere). */
  children: React.ReactNode;
  /** The surface whose role fills this button. Defaults to the admin registry. */
  surfaceName?: string;
  /** Role name on that surface. */
  roleName?: string;
  /** Facts the page already holds (doctor row, skills, …) for the agent. */
  extraKindContext?: Record<string, unknown>;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm";
  className?: string;
}

export default function KindAgentButton({
  children,
  variant = "outline",
  size = "sm",
  className,
  surfaceName = ADMIN_KIND_REGISTRY_SURFACE_NAME,
  roleName = ADMIN_KIND_EDITOR_ROLE,
  ...intent
}: KindAgentButtonProps) {
  const { launch, launching } = useKindAgentLaunch(surfaceName, roleName);
  const [preparing, setPreparing] = useState(false);

  // Every declared variable the live Shape can fill (schema, registration,
  // component, up to 3 saved examples, stored answers) — read at click time.
  async function start() {
    setPreparing(true);
    try {
      await launch(await loadKindEditSeed(intent));
    } finally {
      setPreparing(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={launching || preparing}
      // An expensive click names its consequence first: this starts a run.
      title="Starts an agent run in a window on this page"
      onClick={() => void start()}
    >
      <PencilRuler className="mr-1.5 h-3.5 w-3.5" />
      {children}
    </Button>
  );
}
