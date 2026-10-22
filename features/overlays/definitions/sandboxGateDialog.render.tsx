"use client";

/**
 * The `sandboxGateDialog` overlay: design-system's SandboxGateDialog around chat's SandboxPanel. Asked by
 * `openSandboxGate(...)` (components/dialogs/sandbox-gate/sandboxGateOpener) through `requestOverlay`; "Retry with
 * sandbox" answers `attach`, "Send without sandbox" `detach`, and any dismiss `cancel` so a stray dismiss never sends.
 */
import { SandboxGateDialog } from "@ai-matrx/design-system";
import { SandboxPanel } from "@ai-matrx/chat/agents/components/chat/SandboxPanel";
import { useOverlayRequest, type OverlayRenderProps } from "@ai-matrx/summon/react";
import type {
  SandboxGateChoice,
  SandboxGateOptions,
} from "@/components/dialogs/sandbox-gate/sandboxGateOpener";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<SandboxGateOptions, SandboxGateChoice>(data, close);
  return (
    <SandboxGateDialog open={request !== null} onChoose={settle}>
      {request ? <SandboxPanel conversationId={request.conversationId} /> : null}
    </SandboxGateDialog>
  );
}
