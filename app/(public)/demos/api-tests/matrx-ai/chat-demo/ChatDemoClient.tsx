"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  Play,
  Square,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  RotateCcw,
  Brain,
  Wrench,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { useServerConfig } from "../_shared/useServerConfig";
import { ServerBar } from "../_shared/ServerBar";

// ─── Model Presets ────────────────────────────────────────────────────────────

const MODEL_GROUPS = [
  {
    group: "Anthropic",
    models: [
      { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    ],
  },
  {
    group: "OpenAI",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "o3", label: "o3" },
      { id: "o3-mini", label: "o3-mini" },
      { id: "o4-mini", label: "o4-mini" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  {
    group: "Google",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      {
        id: "gemini-2.0-flash-thinking-exp",
        label: "Gemini 2.0 Flash Thinking",
      },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
  {
    group: "TTS — OpenAI",
    models: [
      { id: "gpt-4o-mini-tts", label: "GPT-4o Mini TTS" },
      { id: "tts-1", label: "TTS-1" },
      { id: "tts-1-hd", label: "TTS-1 HD" },
    ],
  },
  {
    group: "TTS — Google",
    models: [
      { id: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS" },
      { id: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS" },
    ],
  },
  {
    group: "TTS — Groq",
    models: [
      { id: "canopylabs/orpheus-v1-english", label: "Orpheus V1 English" },
      {
        id: "canopylabs/orpheus-arabic-saudi",
        label: "Orpheus Arabic (Saudi)",
      },
    ],
  },
  {
    group: "TTS — xAI",
    models: [{ id: "xai-tts", label: "xAI TTS" }],
  },
];

const ALL_MODEL_IDS = MODEL_GROUPS.flatMap((g) => g.models.map((m) => m.id));
const CUSTOM_SENTINEL = "__custom__";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "system" | "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}
type ExecStatus = "idle" | "connecting" | "running" | "complete" | "error";

interface TokenUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cache_read: number | null;
  reasoning_tokens: number | null;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MESSAGES: Message[] = [
  { role: "user", content: "Hello! What can you help me with today?" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs px-2 gap-1"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => null);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}

function statusBadge(status: ExecStatus) {
  const map: Record<
    ExecStatus,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    idle: { label: "Idle", variant: "outline" },
    connecting: { label: "Connecting", variant: "secondary" },
    running: { label: "Running", variant: "default" },
    complete: { label: "Complete", variant: "secondary" },
    error: { label: "Error", variant: "destructive" },
  };
  const { label, variant } = map[status];
  return (
    <Badge variant={variant} className="text-[10px] h-5 px-1.5">
      {label}
    </Badge>
  );
}

function extractUsage(events: unknown[]): TokenUsage {
  for (const evt of [...events].reverse()) {
    if (!evt || typeof evt !== "object") continue;
    const e = evt as Record<string, unknown>;
    const d = e.data;
    if (!d || typeof d !== "object") continue;
    const data = d as Record<string, unknown>;
    if ("input_tokens" in data) {
      return {
        input_tokens: (data.input_tokens as number) ?? null,
        output_tokens: (data.output_tokens as number) ?? null,
        total_tokens: (data.total_tokens as number) ?? null,
        cache_read: (data.cache_read_input_tokens as number) ?? null,
        reasoning_tokens: (data.reasoning_tokens as number) ?? null,
      };
    }
    if ("usage" in data && data.usage && typeof data.usage === "object") {
      const u = data.usage as Record<string, number>;
      const inp = u.input_tokens ?? 0;
      const out = u.output_tokens ?? 0;
      return {
        input_tokens: u.input_tokens ?? null,
        output_tokens: u.output_tokens ?? null,
        total_tokens: u.total_tokens ?? (inp + out > 0 ? inp + out : null),
        cache_read: u.cache_read_input_tokens ?? null,
        reasoning_tokens: u.reasoning_tokens ?? null,
      };
    }
  }
  return {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    cache_read: null,
    reasoning_tokens: null,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatDemoClient() {
  const config = useServerConfig();

  // Model
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [modelPreset, setModelPreset] = useState(DEFAULT_MODEL);

  // Core
  const [conversationId, setConversationId] = useState("");
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [storeEnabled, setStoreEnabled] = useState(true);

  // Generation
  const [temperature, setTemperature] = useState("");
  const [maxOutputTokens, setMaxOutputTokens] = useState("");
  const [topP, setTopP] = useState("");
  const [topK, setTopK] = useState("");
  const [maxIterations, setMaxIterations] = useState("");

  // Reasoning
  const [reasoningEffort, setReasoningEffort] = useState("");
  const [includeThoughts, setIncludeThoughts] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState("");

  // Tools
  const [toolsList, setToolsList] = useState("");
  const [parallelToolCalls, setParallelToolCalls] = useState(true);
  const [internalWebSearch, setInternalWebSearch] = useState(false);
  const [internalUrlContext, setInternalUrlContext] = useState(false);

  // Advanced
  const [systemInstruction, setSystemInstruction] = useState("");
  const [stopSequences, setStopSequences] = useState("");
  const [responseFormat, setResponseFormat] = useState("");

  // TTS
  const [ttsVoice, setTtsVoice] = useState("");
  const [audioFormat, setAudioFormat] = useState("");
  const [ttsOpen, setTtsOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);

  // Section collapse state
  const [genOpen, setGenOpen] = useState(true);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);

  // Execution
  const [execStatus, setExecStatus] = useState<ExecStatus>("idle");
  const [textOutput, setTextOutput] = useState("");
  const [rawEvents, setRawEvents] = useState("");
  const [eventsLog, setEventsLog] = useState<unknown[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({
    events: 0,
    bytes: 0,
    ms: 0,
    startTime: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = execStatus === "connecting" || execStatus === "running";
  const canRun = messages.length > 0 && modelId.trim().length > 0 && !isRunning;
  const tokenUsage = extractUsage(eventsLog);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (canRun) handleRun();
      }
      if (e.key === "Escape" && isRunning) handleCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, isRunning]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const startTimer = (t: number) => {
    stopTimer();
    timerRef.current = setInterval(
      () => setStats((s) => ({ ...s, ms: Date.now() - t })),
      100,
    );
  };

  const clearResults = () => {
    setTextOutput("");
    setRawEvents("");
    setEventsLog([]);
    setErrorMessage(null);
    setAudioUrl(null);
    setAudioMimeType(null);
    setStats({ events: 0, bytes: 0, ms: 0, startTime: 0 });
    setExecStatus("idle");
  };

  const onPresetChange = (val: string) => {
    setModelPreset(val);
    if (val !== CUSTOM_SENTINEL) setModelId(val);
  };

  const onModelIdChange = (val: string) => {
    setModelId(val);
    setModelPreset(
      ALL_MODEL_IDS.includes(val as (typeof ALL_MODEL_IDS)[number])
        ? val
        : CUSTOM_SENTINEL,
    );
  };

  const addMessage = () => {
    const lastRole = messages.at(-1)?.role ?? "user";
    setMessages((prev) => [
      ...prev,
      { role: lastRole === "user" ? "assistant" : "user", content: "" },
    ]);
  };
  const removeMessage = (i: number) =>
    setMessages((prev) => prev.filter((_, idx) => idx !== i));
  const updateMessage = (i: number, field: keyof Message, val: string) => {
    setMessages((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val } as Message;
      return next;
    });
  };

  const buildBody = () => {
    const body: Record<string, unknown> = {
      ai_model_id: modelId.trim(),
      messages,
      stream: streamEnabled,
      debug: debugMode,
      store: storeEnabled,
    };
    if (conversationId.trim()) body.conversation_id = conversationId.trim();
    if (systemInstruction.trim())
      body.system_instruction = systemInstruction.trim();
    const temp = parseFloat(temperature);
    if (!isNaN(temp)) body.temperature = temp;
    const mtok = parseInt(maxOutputTokens, 10);
    if (!isNaN(mtok)) body.max_output_tokens = mtok;
    const tp = parseFloat(topP);
    if (!isNaN(tp)) body.top_p = tp;
    const tk = parseInt(topK, 10);
    if (!isNaN(tk)) body.top_k = tk;
    const mi = parseInt(maxIterations, 10);
    if (!isNaN(mi)) body.max_iterations = mi;
    if (reasoningEffort) body.reasoning_effort = reasoningEffort;
    if (includeThoughts) body.include_thoughts = true;
    const tb = parseInt(thinkingBudget, 10);
    if (!isNaN(tb)) body.thinking_budget = tb;
    const tools = toolsList
      .trim()
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tools.length > 0) body.tools = tools;
    if (!parallelToolCalls) body.parallel_tool_calls = false;
    if (internalWebSearch) body.internal_web_search = true;
    if (internalUrlContext) body.internal_url_context = true;
    const stops = stopSequences
      .trim()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (stops.length > 0) body.stop_sequences = stops;
    if (responseFormat === "json_object")
      body.response_format = { type: "json_object" };
    if (ttsVoice.trim()) body.tts_voice = ttsVoice.trim();
    if (audioFormat) body.audio_format = audioFormat;
    return body;
  };

  const handleRun = async () => {
    if (!canRun) return;
    clearResults();
    const start = Date.now();
    setStats({ events: 0, bytes: 0, ms: 0, startTime: start });
    setExecStatus("connecting");
    startTimer(start);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${config.serverUrl}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...config.authHeaders },
        body: JSON.stringify(buildBody()),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const d = await res.json();
          msg = d?.detail || d?.error?.message || d?.message || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const { events } = parseNdjsonStream(res, controller.signal);
      setExecStatus("running");
      let eventCount = 0,
        byteCount = 0;

      for await (const evt of events) {
        eventCount++;
        const line = JSON.stringify(evt, null, 2) + "\n\n";
        byteCount += line.length;
        setRawEvents((prev) => prev + line);
        setEventsLog((prev) => [...prev, evt]);
        setStats((s) => ({
          ...s,
          events: eventCount,
          bytes: byteCount,
          ms: Date.now() - start,
        }));
        if (
          evt.event === "chunk" &&
          evt.data &&
          typeof evt.data === "object" &&
          "text" in evt.data
        ) {
          setTextOutput((prev) => prev + (evt.data as { text: string }).text);
        }
        if (evt.event === "data" && evt.data && typeof evt.data === "object") {
          const d = evt.data as Record<string, unknown>;
          if (d.type === "audio_output" && typeof d.url === "string") {
            setAudioUrl(d.url);
            setAudioMimeType(
              typeof d.mime_type === "string" ? d.mime_type : "audio/wav",
            );
          }
        }
        if (evt.event === "error") {
          const d = evt.data as unknown as Record<string, string> | null;
          setErrorMessage(d?.user_message || d?.message || "Stream error");
        }
      }
      setExecStatus((prev) =>
        prev === "running" || prev === "connecting" ? "complete" : prev,
      );
    } catch (err) {
      if (controller.signal.aborted) {
        setExecStatus("idle");
        toast.info("Cancelled");
      } else {
        const msg = err instanceof Error ? err.message : "Request failed";
        setErrorMessage(msg);
        setExecStatus("error");
        toast.error(msg);
      }
    } finally {
      stopTimer();
      setStats((s) => ({ ...s, ms: Date.now() - s.startTime }));
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };
  const requestBodyStr = JSON.stringify(buildBody(), null, 2);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden bg-background">
        <div className="flex-shrink-0 px-3 pt-2 pb-0">
          <ServerBar
            config={config}
            title={
              <div className="flex items-center gap-2 flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h1 className="text-base font-bold">Chat Demo</h1>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  POST /api/ai/chat
                </Badge>
              </div>
            }
          />
        </div>

        <div className="flex-1 min-h-0 px-3 py-2">
          <div className="grid grid-cols-12 gap-2 h-full">
            {/* ── Left: Config ── */}
            <Card className="col-span-5 h-full flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-3 space-y-4">
                  {/* Model */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      AI Model <span className="text-destructive">*</span>
                    </Label>
                    <Select value={modelPreset} onValueChange={onPresetChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select a model…" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_GROUPS.map((g) => (
                          <SelectGroup key={g.group}>
                            <SelectLabel className="text-[10px]">
                              {g.group}
                            </SelectLabel>
                            {g.models.map((m) => (
                              <SelectItem
                                key={m.id}
                                value={m.id}
                                className="text-xs"
                              >
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                        <SelectGroup>
                          <SelectLabel className="text-[10px]">
                            Other
                          </SelectLabel>
                          <SelectItem
                            value={CUSTOM_SENTINEL}
                            className="text-xs italic"
                          >
                            Custom model ID…
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                      value={modelId}
                      onChange={(e) => onModelIdChange(e.target.value)}
                      placeholder="Model ID sent to server (required)"
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                  {/* Core Options */}
                  <div className="p-2.5 bg-muted/30 rounded-md border space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Conversation ID
                      </Label>
                      <Input
                        value={conversationId}
                        onChange={(e) => setConversationId(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className="h-6 text-xs font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {(
                        [
                          ["stream", "Stream", streamEnabled, setStreamEnabled],
                          ["debug", "Debug", debugMode, setDebugMode],
                          ["store", "Store", storeEnabled, setStoreEnabled],
                        ] as [string, string, boolean, (v: boolean) => void][]
                      ).map(([id, label, checked, setter]) => (
                        <div key={id} className="flex items-center gap-1.5">
                          <Checkbox
                            id={id}
                            checked={checked}
                            onCheckedChange={(v) => setter(v as boolean)}
                          />
                          <Label
                            htmlFor={id}
                            className="text-xs cursor-pointer"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generation Params */}
                  <Collapsible open={genOpen} onOpenChange={setGenOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-left hover:text-foreground/80">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-semibold flex-1">
                        Generation
                      </span>
                      {genOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {(
                          [
                            [
                              "temp",
                              "Temperature",
                              temperature,
                              setTemperature,
                              "0.0–2.0",
                            ],
                            [
                              "mtok",
                              "Max Output Tokens",
                              maxOutputTokens,
                              setMaxOutputTokens,
                              "e.g. 4096",
                            ],
                            ["top-p", "Top P", topP, setTopP, "0.0–1.0"],
                            ["top-k", "Top K", topK, setTopK, "integer"],
                            [
                              "max-iter",
                              "Max Iterations",
                              maxIterations,
                              setMaxIterations,
                              "20",
                            ],
                          ] as [
                            string,
                            string,
                            string,
                            (v: string) => void,
                            string,
                          ][]
                        ).map(([id, label, val, setter, ph]) => (
                          <div key={id} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              {label}
                            </Label>
                            <Input
                              value={val}
                              onChange={(e) => setter(e.target.value)}
                              placeholder={ph}
                              className="h-7 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Reasoning */}
                  <Collapsible
                    open={reasoningOpen}
                    onOpenChange={setReasoningOpen}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-left hover:text-foreground/80">
                      <Brain className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-semibold flex-1">
                        Reasoning
                      </span>
                      {reasoningOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pt-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            Reasoning Effort
                          </Label>
                          <Select
                            value={reasoningEffort || "__none__"}
                            onValueChange={(v) =>
                              setReasoningEffort(v === "__none__" ? "" : v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">
                                None (default)
                              </SelectItem>
                              <SelectItem value="low" className="text-xs">
                                Low
                              </SelectItem>
                              <SelectItem value="medium" className="text-xs">
                                Medium
                              </SelectItem>
                              <SelectItem value="high" className="text-xs">
                                High
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id="include-thoughts"
                            checked={includeThoughts}
                            onCheckedChange={(v) =>
                              setIncludeThoughts(v as boolean)
                            }
                          />
                          <Label
                            htmlFor="include-thoughts"
                            className="text-xs cursor-pointer"
                          >
                            Include Thoughts in response
                          </Label>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            Thinking Budget (tokens)
                          </Label>
                          <Input
                            value={thinkingBudget}
                            onChange={(e) => setThinkingBudget(e.target.value)}
                            placeholder="e.g. 10000"
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Tools */}
                  <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-left hover:text-foreground/80">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-semibold flex-1">
                        Tools
                      </span>
                      {toolsOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pt-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            Tool Names (comma-separated)
                          </Label>
                          <Input
                            value={toolsList}
                            onChange={(e) => setToolsList(e.target.value)}
                            placeholder="search, calculator"
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {(
                            [
                              [
                                "parallel-tools",
                                "Parallel Calls",
                                parallelToolCalls,
                                setParallelToolCalls,
                              ],
                              [
                                "web-search",
                                "Web Search",
                                internalWebSearch,
                                setInternalWebSearch,
                              ],
                              [
                                "url-ctx",
                                "URL Context",
                                internalUrlContext,
                                setInternalUrlContext,
                              ],
                            ] as [
                              string,
                              string,
                              boolean,
                              (v: boolean) => void,
                            ][]
                          ).map(([id, label, checked, setter]) => (
                            <div key={id} className="flex items-center gap-1.5">
                              <Checkbox
                                id={id}
                                checked={checked}
                                onCheckedChange={(v) => setter(v as boolean)}
                              />
                              <Label
                                htmlFor={id}
                                className="text-xs cursor-pointer"
                              >
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Advanced */}
                  <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-left hover:text-foreground/80">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-semibold flex-1">
                        Advanced
                      </span>
                      {advOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pt-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            System Instruction (overrides system message)
                          </Label>
                          <Textarea
                            value={systemInstruction}
                            onChange={(e) =>
                              setSystemInstruction(e.target.value)
                            }
                            placeholder="Overrides any system message in the messages array…"
                            className="min-h-[60px] text-xs resize-y"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              Stop Sequences (comma-sep)
                            </Label>
                            <Input
                              value={stopSequences}
                              onChange={(e) => setStopSequences(e.target.value)}
                              placeholder='"END","STOP"'
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              Response Format
                            </Label>
                            <Select
                              value={responseFormat || "__none__"}
                              onValueChange={(v) =>
                                setResponseFormat(v === "__none__" ? "" : v)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__none__"
                                  className="text-xs"
                                >
                                  None
                                </SelectItem>
                                <SelectItem
                                  value="json_object"
                                  className="text-xs"
                                >
                                  JSON Object
                                </SelectItem>
                                <SelectItem value="text" className="text-xs">
                                  Text
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* TTS */}
                  <Collapsible open={ttsOpen} onOpenChange={setTtsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-left hover:text-foreground/80">
                      <Volume2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-semibold flex-1">
                        Text-to-Speech
                      </span>
                      {ttsOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pt-2 p-2.5 bg-muted/30 rounded-md border mt-1">
                        <p className="text-[10px] text-muted-foreground">
                          Select a TTS model above, then set a voice. The
                          response arrives as a{" "}
                          <code className="font-mono">data</code> stream event
                          with an audio URL.
                        </p>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            Voice (tts_voice)
                          </Label>
                          <Input
                            value={ttsVoice}
                            onChange={(e) => setTtsVoice(e.target.value)}
                            placeholder="e.g. alloy, coral, kore, Orus"
                            className="h-7 text-xs font-mono"
                          />
                          <p className="text-[9px] text-muted-foreground">
                            OpenAI: alloy, coral, echo, fable, onyx, nova,
                            shimmer. Google: Kore, Charon, Fenrir, Orus, etc.
                            Groq: tara, leah, leo. xAI: eve, isla, luma, orion,
                            sol.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            Audio Format (audio_format)
                          </Label>
                          <Select
                            value={audioFormat || "__none__"}
                            onValueChange={(v) =>
                              setAudioFormat(v === "__none__" ? "" : v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">
                                Provider default
                              </SelectItem>
                              <SelectItem value="mp3" className="text-xs">
                                mp3
                              </SelectItem>
                              <SelectItem value="wav" className="text-xs">
                                wav
                              </SelectItem>
                              <SelectItem value="ogg" className="text-xs">
                                ogg
                              </SelectItem>
                              <SelectItem value="opus" className="text-xs">
                                opus
                              </SelectItem>
                              <SelectItem value="aac" className="text-xs">
                                aac
                              </SelectItem>
                              <SelectItem value="flac" className="text-xs">
                                flac
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[9px] text-muted-foreground">
                            Groq always returns wav regardless of this setting.
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Messages */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Messages ({messages.length})
                      </Label>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setMessages(DEFAULT_MESSAGES)}
                          className="h-5 text-[10px] px-1.5 gap-0.5"
                        >
                          <RotateCcw className="h-2.5 w-2.5" /> Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={addMessage}
                          className="h-5 text-[10px] px-1.5 gap-0.5"
                        >
                          <Plus className="h-2.5 w-2.5" /> Add
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {messages.map((msg, i) => (
                        <Card key={i} className="p-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Select
                              value={msg.role}
                              onValueChange={(v) => updateMessage(i, "role", v)}
                            >
                              <SelectTrigger className="h-6 text-xs w-24 flex-shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="system" className="text-xs">
                                  System
                                </SelectItem>
                                <SelectItem value="user" className="text-xs">
                                  User
                                </SelectItem>
                                <SelectItem
                                  value="assistant"
                                  className="text-xs"
                                >
                                  Assistant
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Badge
                              variant={
                                msg.role === "system"
                                  ? "outline"
                                  : msg.role === "user"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-[9px] h-4 px-1"
                            >
                              {i + 1}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMessage(i)}
                              className="h-6 w-6 p-0 ml-auto"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Textarea
                            value={msg.content}
                            onChange={(e) =>
                              updateMessage(i, "content", e.target.value)
                            }
                            placeholder={`${msg.role} message…`}
                            className="min-h-[80px] text-xs font-mono resize-y"
                          />
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 p-3 border-t flex gap-2">
                {!isRunning ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleRun}
                        disabled={!canRun}
                        className="flex-1 h-8 gap-2 text-sm"
                      >
                        <Play className="h-3.5 w-3.5" /> Send Request
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Ctrl/Cmd + Enter
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    onClick={handleCancel}
                    variant="destructive"
                    className="flex-1 h-8 gap-2 text-sm"
                  >
                    <Square className="h-3.5 w-3.5" /> Cancel
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearResults}
                      disabled={isRunning}
                      className="h-8 w-8 p-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Clear results
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>

            {/* ── Right: Results ── */}
            <Card className="col-span-7 h-full flex flex-col overflow-hidden p-3">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">Results</span>
                  {statusBadge(execStatus)}
                  {modelId && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 font-mono"
                    >
                      {modelId}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                  {(stats.events > 0 || isRunning) && (
                    <>
                      <span>{stats.events} evt</span>
                      <span>{(stats.bytes / 1024).toFixed(1)} KB</span>
                      <span>{(stats.ms / 1000).toFixed(1)}s</span>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearResults}
                    disabled={isRunning}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {errorMessage && (
                <div className="flex-shrink-0 mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive font-mono">
                  ❌ {errorMessage}
                </div>
              )}

              {audioUrl && (
                <div className="flex-shrink-0 mb-2 p-3 bg-muted/40 border rounded space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">Audio Output</span>
                    {audioMimeType && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1.5 font-mono"
                      >
                        {audioMimeType}
                      </Badge>
                    )}
                  </div>
                  <audio controls src={audioUrl} className="w-full h-8" />
                  <a
                    href={audioUrl}
                    download
                    className="text-[10px] text-primary underline"
                  >
                    Download audio
                  </a>
                </div>
              )}

              <Tabs
                defaultValue="text"
                className="flex-1 flex flex-col overflow-hidden min-h-0"
              >
                <TabsList className="grid grid-cols-4 h-8 flex-shrink-0">
                  <TabsTrigger value="text" className="text-xs">
                    Text Output
                  </TabsTrigger>
                  <TabsTrigger value="events" className="text-xs">
                    Stream Events
                  </TabsTrigger>
                  <TabsTrigger value="usage" className="text-xs">
                    Token Usage
                  </TabsTrigger>
                  <TabsTrigger value="request" className="text-xs">
                    Request
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="text"
                  className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted/30 rounded border min-h-0"
                >
                  <div className="flex justify-end flex-shrink-0 mb-1">
                    <CopyButton text={textOutput} />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {isRunning && !textOutput && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting
                        for response…
                      </div>
                    )}
                    {textOutput ? (
                      <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">
                        {textOutput}
                      </pre>
                    ) : !isRunning ? (
                      <p className="text-xs text-muted-foreground">
                        No output yet. Send a request above.
                      </p>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent
                  value="events"
                  className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted rounded border min-h-0"
                >
                  <div className="flex justify-end flex-shrink-0 mb-1">
                    <CopyButton text={rawEvents} />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {isRunning && !rawEvents && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Streaming…
                      </div>
                    )}
                    <pre className="text-[11px] font-mono whitespace-pre-wrap">
                      {rawEvents || (!isRunning ? "No events yet." : "")}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent
                  value="usage"
                  className="flex-1 overflow-y-auto mt-2 p-3 bg-muted/30 rounded border min-h-0"
                >
                  {tokenUsage.input_tokens !== null ||
                  tokenUsage.output_tokens !== null ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            label: "Input Tokens",
                            value: tokenUsage.input_tokens,
                          },
                          {
                            label: "Output Tokens",
                            value: tokenUsage.output_tokens,
                          },
                          tokenUsage.total_tokens !== null
                            ? {
                                label: "Total Tokens",
                                value: tokenUsage.total_tokens,
                              }
                            : null,
                          tokenUsage.cache_read !== null
                            ? {
                                label: "Cache Read Tokens",
                                value: tokenUsage.cache_read,
                              }
                            : null,
                          tokenUsage.reasoning_tokens !== null
                            ? {
                                label: "Reasoning Tokens",
                                value: tokenUsage.reasoning_tokens,
                              }
                            : null,
                        ]
                          .filter(Boolean)
                          .map(
                            (item) =>
                              item && (
                                <div
                                  key={item.label}
                                  className="p-3 bg-background rounded border"
                                >
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                                    {item.label}
                                  </p>
                                  <p className="text-2xl font-bold font-mono">
                                    {item.value?.toLocaleString() ?? "—"}
                                  </p>
                                </div>
                              ),
                          )}
                      </div>
                      <div className="p-2 bg-muted rounded text-[11px] text-muted-foreground font-mono">
                        {(stats.ms / 1000).toFixed(2)}s · {stats.events} events
                        · {(stats.bytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          {execStatus === "complete"
                            ? "No token usage in stream events."
                            : "Run a request to see token usage."}
                        </p>
                        {execStatus === "complete" && (
                          <p className="text-xs text-muted-foreground mt-1 opacity-60">
                            Check Stream Events tab for raw data.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="request"
                  className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted rounded border min-h-0"
                >
                  <div className="flex justify-end flex-shrink-0 mb-1">
                    <CopyButton
                      text={`POST ${config.serverUrl}/api/ai/chat\n\n${requestBodyStr}`}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/80">
                      {`POST ${config.serverUrl}/api/ai/chat\n`}
                      {`Authorization: Bearer ${config.authToken || "<token>"}\n`}
                      {`Content-Type: application/json\n\n`}
                      {requestBodyStr}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
