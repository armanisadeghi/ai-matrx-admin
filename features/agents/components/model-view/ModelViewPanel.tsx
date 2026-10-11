"use client";

/**
 * ModelViewPanel — "what the model sees" for the draft being built.
 *
 * A dry run of the SAME manual request a test run sends (unsaved edits
 * included): the system prompt and messages after substitution, and — apart
 * from them — the blocks the platform adds. Nothing is sent to a model or saved.
 * Variable values are edited here; the view follows.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { ProTextarea } from "@/components/official/ProTextarea";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { AGENT_BUILDER_CONTEXT_MENU_PROPS } from "@ai-matrx/chat/agents/agent-context/buildAgentBuilderContextData";
import { toast } from "@/lib/toast";
import {
  effectiveVariables,
  emptyVariables,
  fullModelText,
  messageText,
  platformLabel,
  splitByValues,
  valueAsText,
  type ModelViewPreview,
  type PreviewPart,
} from "./modelViewLogic";
import { requestModelView, type ModelViewResult } from "./requestModelView";

const REFRESH_DELAY_MS = 450;

interface ModelViewPanelProps {
  agentId: string;
  conversationId: string;
}

export function ModelViewPanel({ agentId, conversationId }: ModelViewPanelProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const draft = useAppSelector((state) => selectAgentById(state, agentId));
  const { copyText } = useClipboard({
    notify: (message, kind) =>
      kind === "error" ? toast.error(message) : toast.success(message),
  });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ModelViewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  // Re-runs on every draft edit, variable edit and Refresh; the previous answer
  // stays on screen until the new one lands, so nothing jumps.
  useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(() => {
      requestModelView(dispatch, store.getState() as never, conversationId, edits)
        .then((next) => {
          if (mine !== seq.current) return;
          setResult(next);
          setError(null);
        })
        .catch((e: unknown) => {
          if (mine !== seq.current) return;
          setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (mine === seq.current) setLoading(false);
        });
    }, REFRESH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dispatch, store, conversationId, edits, draft, nonce]);

  const values = useMemo(
    () => effectiveVariables(result?.baseVariables ?? {}, edits),
    [result, edits],
  );
  const insertedValues = useMemo(
    () => Object.values(values).map(valueAsText).filter(Boolean),
    [values],
  );
  const empties = useMemo(
    () => emptyVariables(result?.declared ?? [], values),
    [result, values],
  );

  const copy = useCallback(
    (label: string, text: string) => void copyText(text, `${label} copied`),
    [copyText],
  );

  const preview = result?.preview ?? null;
  const promptText = (preview?.system_parts ?? [])
    .filter((p) => p.kind === "prompt")
    .map((p) => p.text)
    .join("")
    .trim();
  const platformParts: PreviewPart[] = [
    ...(preview?.system_parts ?? []).filter((p) => p.kind !== "prompt"),
    ...(preview?.turn_blocks ?? []),
  ];

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto bg-textured p-3"
      data-testid="model-view"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
          {preview?.model ?? ""}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="quiet"
            icon={<Copy />}
            disabled={!preview}
            onClick={() => preview && copy("All", fullModelText(preview))}
          >
            Copy all
          </Button>
          <Button
            variant="quiet"
            icon={<RefreshCw className={loading ? "animate-spin" : undefined} />}
            onClick={() => setNonce((n) => n + 1)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-border bg-card px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {result && result.declared.length > 0 ? (
        <section className="flex flex-col gap-2" aria-label="Variables">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">Variables</h3>
            {empties.length > 0 ? (
              <span className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                <span className="text-[10px] text-muted-foreground">Empty</span>
                {empties.map((name) => (
                  <Badge key={name} tone="warning">
                    {name}
                  </Badge>
                ))}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.declared.map((name) => (
              <label key={name} className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {name}
                </span>
                <ProTextarea
                  aria-label={`Value of ${name}`}
                  value={name in edits ? edits[name] : valueAsText(result.baseVariables[name])}
                  onChange={(e) => setEdits((m) => ({ ...m, [name]: e.target.value }))}
                  minHeight={32}
                  maxHeight={120}
                  surfaceName={AGENT_BUILDER_CONTEXT_MENU_PROPS.surfaceName}
                  enableTextStats={false}
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <Block
        title="System prompt"
        onCopy={promptText ? () => copy("System prompt", promptText) : undefined}
      >
        <Mono text={promptText || "(empty)"} values={insertedValues} />
      </Block>

      <Block title={`Messages (${preview?.messages.length ?? 0})`}>
        {(preview?.messages ?? []).map((message, index) => (
          <MessageBlock
            key={index}
            message={message}
            values={insertedValues}
            onCopy={(text) => copy("Message", text)}
          />
        ))}
        {preview && preview.messages.length === 0 ? (
          <Mono text="(none)" values={[]} />
        ) : null}
      </Block>

      <Block title="Platform blocks">
        {platformParts.map((part, index) => (
          <div key={`${part.kind}-${index}`} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                {platformLabel(part.kind)}
              </span>
              <Button
                variant="quiet"
                icon={<Copy />}
                onClick={() => copy(platformLabel(part.kind), part.text)}
              >
                Copy
              </Button>
            </div>
            <Mono text={part.text} values={[]} platform />
          </div>
        ))}
        {preview && platformParts.length === 0 ? (
          <Mono text="(none)" values={[]} />
        ) : null}
      </Block>
    </div>
  );
}

function Block({
  title,
  onCopy,
  children,
}: {
  title: string;
  onCopy?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        {onCopy ? (
          <Button variant="quiet" icon={<Copy />} onClick={onCopy}>
            Copy
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MessageBlock({
  message,
  values,
  onCopy,
}: {
  message: Record<string, unknown>;
  values: readonly string[];
  onCopy: (text: string) => void;
}) {
  const text = messageText(message);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {String(message.role ?? "")}
        </span>
        <Button variant="quiet" icon={<Copy />} onClick={() => onCopy(text)}>
          Copy
        </Button>
      </div>
      <Mono text={text || "(empty)"} values={values} />
    </div>
  );
}

const Mono = memo(function Mono({
  text,
  values,
  platform,
}: {
  text: string;
  values: readonly string[];
  platform?: boolean;
}) {
  const segments = useMemo(() => splitByValues(text, values), [text, values]);
  return (
    <pre
      className={
        "max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border p-2.5 font-mono text-[11px] leading-relaxed " +
        (platform ? "bg-muted/40 text-muted-foreground" : "bg-card text-foreground")
      }
    >
      {segments.map((segment, i) =>
        segment.inserted ? (
          <mark key={i} className="rounded-sm bg-primary/15 text-foreground">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </pre>
  );
});

export type { ModelViewPreview };
