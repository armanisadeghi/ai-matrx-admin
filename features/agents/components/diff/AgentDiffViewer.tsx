"use client";

// The web's binding of THE agent diff (@ai-matrx/agents/versions/react): the viewer, its field
// adapters and its comparison live in the package; the web supplies its two ports — the catalogue
// lookups that name model/tool/MCP ids, and its linked identity refs.

import {
  AgentDiffViewer as PackageAgentDiffViewer,
  type AgentDiffViewerProps,
  type AgentModelRefProps,
  type AgentToolRefProps,
} from "@ai-matrx/agents/versions/react";
import { useDiffEnrichment } from "@ai-matrx/chat/agents/hooks/useDiffEnrichment";
import { AiModelRef, AiToolRef } from "@ai-matrx/chat/agents/components/identity-refs/AiIdentityRef";

export { buildAgentAdapterRegistry } from "@ai-matrx/agents/versions/react";

function ModelRef({ modelId, name, showId, className }: AgentModelRefProps) {
  return <AiModelRef modelId={modelId} name={name ?? undefined} showId={showId === true} showIcon={false} className={className} />;
}

function ToolRef({ toolId, name, showId, className }: AgentToolRefProps) {
  return <AiToolRef toolId={toolId} name={name ?? undefined} showId={showId === true} showIcon={false} className={className} />;
}

const WEB_REFS = { ModelRef, ToolRef };

export function AgentDiffViewer(props: Omit<AgentDiffViewerProps, "enrichment" | "refs">) {
  const enrichment = useDiffEnrichment();
  return <PackageAgentDiffViewer {...props} enrichment={enrichment} refs={WEB_REFS} />;
}
