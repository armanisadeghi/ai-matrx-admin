"use client";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { Button, Chip } from "@ai-matrx/design-system/controls";
import React, { useEffect, useState } from "react";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { HelpCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { KindValueFrontDoor } from "@/components/official/structured-value/KindValueFrontDoor";
import { valueCarriesKind } from "@/features/content-ir/surfaces/json-kind-signal";

export interface UnknownDataEventBlockProps {
  dataType: string;
  data: Record<string, unknown>;
  /** Provenance for the "Copy for AI" payload — threaded by BlockRenderer. */
  conversationId?: string;
  messageId?: string;
}

/** The stream layer's own `_dataType` tag is plumbing, never part of the value. */
function withoutEnvelopeTag(data: Record<string, unknown>): Record<string, unknown> {
  const { _dataType: _tag, ...rest } = data;
  void _tag;
  return rest;
}

/**
 * Catchall block rendered when a `data` event arrives whose `type` is not
 * registered. Every field is visible so the team can immediately see what
 * arrived. The "Copy for AI" button wraps the full failure context (page,
 * conversation/message id, error, payload) in an XML-ish block an agent can act
 * on cold — the canonical failure-reporting affordance for the artifact system.
 */
const UnknownDataEventBlock: React.FC<UnknownDataEventBlockProps> = ({
  dataType,
  data,
  conversationId,
  messageId,
}) => {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const [isCopied, setIsCopied] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const pretty = JSON.stringify(data, null, 2);
  // A payload carrying `__kind` (at its root or inside) is a kind whatever its
  // event type: it renders through the one value door and that is the CORRECT
  // outcome, not a defect — nothing is filed (2026-10-17: a red "the caller
  // should render this through AnswerValueView" blamed a caller that does not
  // exist; this block IS the door for a stream data event). Only a payload with
  // no kind in it and no registered screen is a real gap, so only that is filed.
  const kindPayload = valueCarriesKind(data);
  useEffect(() => {
    if (kindPayload) return;
    captureError({
      source: "content-ir",
      relation: dataType,
      message: `The server sent a "${dataType}" event that no screen handles.`,
      hint: `Register a screen for the "${dataType}" data event type, or have the server send it as a kind value. Find the emitter with a search for "${dataType}" in aidream.`,
      recoverable: true,
    });
  }, [kindPayload, dataType]);

  const handleCopy = async () => {
    if (!(await copyText(pretty))) return;
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyForAi = async () => {
    const page =
      typeof window !== "undefined" ? window.location.href : "(unknown)";
    const payload = [
      `<artifact_failure>`,
      `  <error>Render-block failure: data type "${dataType}" is not registered — it fell through to the Unknown Data Event fallback (normalize-content-blocks.ts → makeUnknown).</error>`,
      `  <page>${page}</page>`,
      `  <conversation_id>${conversationId ?? "(unknown)"}</conversation_id>`,
      `  <message_id>${messageId ?? "(unknown)"}</message_id>`,
      `  <data_type>${dataType}</data_type>`,
      `  <payload>`,
      pretty,
      `  </payload>`,
      `  <instructions>This is an AI Matrx artifact/canvas system failure. Diagnose why this block was not recognized and routed to its renderer (likely a save/find shape mismatch). Fix the recognition so it renders correctly and never falls to Unknown Data Event.</instructions>`,
      `</artifact_failure>`,
    ].join("\n");
    if (!(await copyText(payload))) return;
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2000);
  };

  if (kindPayload) {
    return (
      <div className="my-2 min-w-0">
        <KindValueFrontDoor value={withoutEnvelopeTag(data)} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/5 my-2 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <HelpCircle className="w-4 h-4 text-warning flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Unknown Data Event
            </span>
            <Chip tone="warning" label={dataType} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            This data type is not yet registered. Expand to inspect, or Copy for
            AI to hand an agent the full context.
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="quiet"
            onClick={handleCopyForAi}
            title="Copy full failure context for an AI agent"
            icon={aiCopied ? <Check />  : <AGENT_ICON />}
          >
            Copy for AI
          </Button>
          <Button variant="quiet" icon={isCopied ? (
              <Check />
            ) : (
              <Copy />
            )} glyphTone={aiCopied ? "success" : undefined} onClick={handleCopy} title="Copy JSON" aria-label="Copy JSON" />
          <Button variant="quiet" icon={isExpanded ? (
              <ChevronUp />
            ) : (
              <ChevronDown />
            )} onClick={() => setIsExpanded((v) => !v)} aria-label={isExpanded ? "Collapse" : "Expand"} aria-expanded={isExpanded} />
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-border/40 px-3 py-2">
          <pre className="text-xs text-muted-foreground overflow-auto max-h-60 leading-relaxed font-mono">
            {pretty}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UnknownDataEventBlock;
