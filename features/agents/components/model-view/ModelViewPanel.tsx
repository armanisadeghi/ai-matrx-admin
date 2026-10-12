"use client";

/**
 * ModelViewPanel — the exact request the model's provider would receive.
 *
 * The server runs the whole real run for the draft (unsaved edits, what is
 * typed in the composer below, variables, context) and stops at the provider
 * call, returning the request instead of sending it. This panel lays that
 * request out IN ORDER — system, every message with every part, tools, then
 * every other parameter — with whitespace kept. Nothing is reordered, merged,
 * filled or omitted; "Raw JSON" shows the whole payload and Copy all copies
 * its exact bytes.
 */

import { useEffect, useRef, useState } from "react";
import { Braces, Check, ChevronDown, ChevronRight, Copy, RefreshCw } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { toast } from "@/lib/toast";
import {
  blockLevelLabel,
  copyAllText,
  jsonText,
  prettyBody,
  sectionsOf,
  type ModelViewPreview,
  type RequestMessage,
  type RequestPart,
  type RequestTool,
} from "./modelViewLogic";
import { listVariants } from "@/features/prompt-blocks/service";
import { requestModelView } from "./requestModelView";

const REFRESH_DELAY_MS = 450;

interface ModelViewPanelProps {
  agentId: string;
  conversationId: string;
}

function CopyButton({ onCopy, disabled, children = "Copy" }: { onCopy: () => void; disabled?: boolean; children?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1500);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <Button
      variant="quiet"
      icon={done ? <Check /> : <Copy />}
      disabled={disabled}
      aria-live="polite"
      onClick={() => {
        onCopy();
        setDone(true);
      }}
    >
      {done ? "Copied" : children}
    </Button>
  );
}

/** Everything the request is built from: the draft, the composer, variables, context, history. */
function useRequestInputs(agentId: string, conversationId: string) {
  const draft = useAppSelector((state) => selectAgentById(state, agentId));
  const conversation = useAppSelector((s: RootState) => s.conversations.byConversationId[conversationId]);
  const typed = useAppSelector(
    (s: RootState) => (s as unknown as { instanceUserInput?: { byConversationId?: Record<string, unknown> } }).instanceUserInput?.byConversationId?.[conversationId],
  );
  const variables = useAppSelector((s: RootState) => s.instanceVariableValues.byConversationId[conversationId]);
  const resources = useAppSelector(
    (s: RootState) => (s as unknown as { instanceResources?: { byConversationId?: Record<string, unknown> } }).instanceResources?.byConversationId?.[conversationId],
  );
  const context = useAppSelector(
    (s: RootState) => (s as unknown as { instanceContext?: { byConversationId?: Record<string, unknown> } }).instanceContext?.byConversationId?.[conversationId],
  );
  const ui = useAppSelector((s: RootState) => s.instanceUIState.byConversationId[conversationId]);
  const messages = useAppSelector((s: RootState) => s.messages.byConversationId[conversationId]);
  return [draft, conversation, typed, variables, resources, context, ui, messages] as const;
}

export function ModelViewPanel({ agentId, conversationId }: ModelViewPanelProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const [draft, conversation, typed, variables, resources, context, ui, messages] = useRequestInputs(
    agentId,
    conversationId,
  );
  const { copyText } = useClipboard({
    notify: (message, kind) => (kind === "error" ? toast.error(message) : toast.success(message)),
  });
  const [preview, setPreview] = useState<ModelViewPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState(false);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);
  const loadedOnce = useRef(false);

  // Re-runs on every draft edit, keystroke in the composer, variable or context
  // change, and Refresh; the previous answer stays on screen until the next lands.
  useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(
      () => {
        loadedOnce.current = true;
        requestModelView(dispatch, store.getState as () => RootState, conversationId, agentId)
          .then((next) => {
            if (mine !== seq.current) return;
            setPreview(next);
            setError(null);
          })
          .catch((e: unknown) => {
            if (mine !== seq.current) return;
            // A refused capture shows its reason alone: the previous request is not what
            // the model would receive now, so it must not stay on screen beside the reason.
            setPreview(null);
            setError(e instanceof Error ? e.message : String(e));
          })
          .finally(() => {
            if (mine === seq.current) setLoading(false);
          });
      },
      loadedOnce.current ? REFRESH_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [dispatch, store, conversationId, agentId, nonce, draft, conversation, typed, variables, resources, context, ui, messages]);

  const copy = (label: string, text: string) => void copyText(text, `${label} copied`);
  const request = preview?.request ?? null;
  const sections = request ? sectionsOf(request.body) : null;
  const variantLabels = useVariantLabels(preview?.prompt_blocks);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto bg-textured p-3" data-testid="model-view">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {/* One slot: the target, or Capturing… while a capture runs, so the header never changes size. */}
          {loading ? (
            <span role="status" data-testid="model-view-capturing">
              Capturing…
            </span>
          ) : (
            <span className="font-mono" data-testid="model-view-target">
              {request ? `${request.provider} · ${request.model ?? preview?.model ?? ""}` : ""}
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant={raw ? "outline" : "quiet"}
            icon={<Braces />}
            disabled={!request}
            aria-pressed={raw}
            onClick={() => setRaw((r) => !r)}
          >
            Raw JSON
          </Button>
          <CopyButton disabled={!request} onCopy={() => request && copy("Request", copyAllText(request))}>
            Copy all
          </CopyButton>
          <Button
            variant="quiet"
            icon={<RefreshCw className={loading ? "animate-spin" : undefined} />}
            onClick={() => setNonce((n) => n + 1)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* The previous capture stays, dimmed, while the next one runs; same layout, no shift. */}
      <div
        className={`flex flex-col gap-3 transition-opacity ${loading && request ? "opacity-50" : ""}`}
        aria-busy={loading}
        data-testid="model-view-body"
      >
      {request ? (
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={request.url}>
          {request.method} {request.url}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-md border border-border bg-card px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {request?.transport === "uncaptured" ? (
        <p role="status" className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          This model&apos;s wire request can&apos;t be captured; shown is the request it runs from.
        </p>
      ) : null}

      {(preview?.notices ?? []).map((n, i) => (
        <p
          key={`${n.code ?? "notice"}-${i}`}
          className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground"
        >
          {n.user_message || n.system_message || n.code}
        </p>
      ))}

      {!request && !error && loading ? <ModelViewSkeleton /> : null}

      {request && raw ? (
        <Mono text={prettyBody(request)} testId="model-view-raw" />
      ) : null}

      {request && sections && !raw ? (
        <>
          <Section title={`System (${sections.system.length})`} sub={sections.systemKey}>
            {sections.system.length === 0 ? <Mono text="(none)" /> : null}
            {sections.system.map((part, i) => (
              <Part key={i} part={part} onCopy={copy} />
            ))}
          </Section>

          <Section title={`Messages (${sections.messages.length})`} sub={sections.messagesKey}>
            {sections.messages.map((m, i) => (
              <Message key={i} message={m} onCopy={copy} />
            ))}
          </Section>

          <ToolsSection tools={sections.tools} />

          <Section title="Parameters">
            <div className="flex flex-col gap-1" data-testid="model-view-params">
              {sections.params.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-2 font-mono text-[11px]">
                  <span className="text-muted-foreground">{key}</span>
                  <pre className="whitespace-pre-wrap break-words text-foreground">{jsonText(value)}</pre>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : null}

      {preview?.prompt_blocks && preview.prompt_blocks.length > 0 ? (
        <Section title={`Prompt blocks (${preview.prompt_blocks.length})`}>
          <ul className="flex flex-col gap-1" data-testid="model-view-prompt-blocks">
            {preview.prompt_blocks.map((b) => (
              <li
                key={b.name}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-xs"
                data-testid={`model-view-block-${b.name}`}
              >
                <span className="truncate font-mono">{b.name}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <Badge>{blockLevelLabel(b.level)}</Badge>
                  <Badge tone={b.variant_id ? "info" : "neutral"}>
                    {b.variant_id ? (variantLabels[b.variant_id] ?? "Variant") : "Default text"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      </div>
    </div>
  );
}

/** The final layout in outline, shown before the first capture lands. */
function ModelViewSkeleton() {
  const bar = (h: string) => <div className={`${h} animate-pulse rounded-md border border-border bg-card`} />;
  return (
    <div className="flex flex-col gap-3" data-testid="model-view-skeleton" aria-hidden="true">
      {["System", "Messages", "Tools", "Parameters"].map((title) => (
        <section key={title} className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
          {bar(title === "Parameters" ? "h-16" : "h-20")}
        </section>
      ))}
    </div>
  );
}

/** Names of the variants the report points at (the report carries ids only). */
function useVariantLabels(report: ModelViewPreview["prompt_blocks"]): Record<string, string> {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const key = (report ?? []).map((b) => `${b.block_id}:${b.variant_id}`).join("|");
  useEffect(() => {
    const wanted = (report ?? []).filter((b) => b.variant_id && b.block_id);
    if (wanted.length === 0) return;
    let cancelled = false;
    void Promise.all(wanted.map((b) => listVariants(b.block_id as string).catch(() => []))).then((lists) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const v of lists.flat()) next[v.id] = v.label || "Variant";
      setLabels(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return labels;
}

function Section({ title, sub, children }: { title: string; sub?: string | null; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5" aria-label={title}>
      <h3 className="flex items-baseline gap-2 text-xs font-semibold text-foreground">
        {title}
        {sub ? <span className="font-mono text-[10px] font-normal text-muted-foreground">{sub}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function Message({ message, onCopy }: { message: RequestMessage; onCopy: (label: string, text: string) => void }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-2" data-testid="model-view-message">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{message.role}</span>
      {message.parts.map((part, i) => (
        <Part key={i} part={part} onCopy={onCopy} />
      ))}
    </div>
  );
}

function Part({ part, onCopy }: { part: RequestPart; onCopy: (label: string, text: string) => void }) {
  const text = part.kind === "text" ? part.text : jsonText(part.value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{part.label}</span>
        <CopyButton onCopy={() => onCopy("Part", text)} />
      </div>
      <Mono text={text} />
      {part.kind === "text" && part.extras ? (
        <pre className="whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">
          {jsonText(part.extras)}
        </pre>
      ) : null}
    </div>
  );
}

function ToolsSection({ tools }: { tools: RequestTool[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const allOpen = tools.length > 0 && tools.every((_, i) => open[i]);
  return (
    <section className="flex flex-col gap-1.5" aria-label="Tools">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">{`Tools (${tools.length})`}</h3>
        {tools.length > 0 ? (
          <Button
            variant="quiet"
            onClick={() => setOpen(allOpen ? {} : Object.fromEntries(tools.map((_, i) => [i, true])))}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        ) : null}
      </div>
      {tools.map((tool, i) => (
        <div key={i} className="rounded-md border border-border" data-testid="model-view-tool">
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-2 py-1 text-left font-mono text-[11px]"
            aria-expanded={Boolean(open[i])}
            onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
          >
            {open[i] ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {tool.name}
          </button>
          {open[i] ? <Mono text={jsonText(tool.value)} /> : null}
        </div>
      ))}
    </section>
  );
}

function Mono({ text, testId }: { text: string; testId?: string }) {
  return (
    <pre
      data-testid={testId}
      className="whitespace-pre-wrap break-words rounded-md border border-border bg-card p-2.5 font-mono text-[11px] leading-relaxed text-foreground"
    >
      {text}
    </pre>
  );
}

export type { ModelViewPreview };
