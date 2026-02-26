'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bot,
  Play,
  Square,
  Zap,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import { useServerConfig } from '../_shared/useServerConfig';
import { ServerBar } from '../_shared/ServerBar';

// ─── Types ─────────────────────────────────────────────────────────────────

type ExecStatus = 'idle' | 'connecting' | 'running' | 'complete' | 'error' | 'cancelled';

interface KVPair { key: string; value: string; }

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusBadge(status: ExecStatus) {
  const map: Record<ExecStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    idle:       { label: 'Idle',       variant: 'outline' },
    connecting: { label: 'Connecting', variant: 'secondary' },
    running:    { label: 'Running',    variant: 'default' },
    complete:   { label: 'Complete',   variant: 'secondary' },
    error:      { label: 'Error',      variant: 'destructive' },
    cancelled:  { label: 'Cancelled',  variant: 'outline' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant} className="text-[10px] h-5 px-1.5">{label}</Badge>;
}

function CopyButton({ text }: { text: string }) {
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
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function tryParseJson(s: string): { ok: boolean; obj?: unknown } {
  try { return { ok: true, obj: JSON.parse(s) }; }
  catch { return { ok: false }; }
}

// ─── KV Editor ─────────────────────────────────────────────────────────────

function KVEditor({ label, pairs, onChange }: {
  label: string;
  pairs: KVPair[];
  onChange: (pairs: KVPair[]) => void;
}) {
  const add = () => onChange([...pairs, { key: '', value: '' }]);
  const remove = (i: number) => onChange(pairs.filter((_, idx) => idx !== i));
  const update = (i: number, field: 'key' | 'value', v: string) => {
    const next = [...pairs];
    next[i] = { ...next[i], [field]: v };
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        <Button size="sm" variant="ghost" onClick={add} className="h-5 text-[10px] px-1.5 gap-1">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {pairs.length === 0 && (
        <p className="text-[10px] text-muted-foreground italic pl-0.5">No entries — click Add to start</p>
      )}
      {pairs.map((pair, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Input
            value={pair.key}
            onChange={e => update(i, 'key', e.target.value)}
            placeholder="key"
            className="h-6 text-xs font-mono flex-1 min-w-0"
          />
          <span className="text-muted-foreground text-xs flex-shrink-0">:</span>
          <Input
            value={pair.value}
            onChange={e => update(i, 'value', e.target.value)}
            placeholder="value"
            className="h-6 text-xs font-mono flex-1 min-w-0"
          />
          <Button size="sm" variant="ghost" onClick={() => remove(i)} className="h-6 w-6 p-0 flex-shrink-0">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function AgentDemoClient() {
  const config = useServerConfig();

  // Config inputs
  const [agentId, setAgentId] = useState('');
  const [userInput, setUserInput] = useState('Hello! Can you help me?');
  const [variables, setVariables] = useState<KVPair[]>([]);
  const [configOverridesRaw, setConfigOverridesRaw] = useState('{}');
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  // Execution state
  const [execStatus, setExecStatus] = useState<ExecStatus>('idle');
  const [textOutput, setTextOutput] = useState('');
  const [rawEvents, setRawEvents] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [stats, setStats] = useState({ events: 0, bytes: 0, ms: 0, startTime: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived
  const configOverridesParsed = tryParseJson(configOverridesRaw);
  const canExecute = agentId.trim().length > 0 && execStatus !== 'connecting' && execStatus !== 'running';

  const clearResults = () => {
    setTextOutput('');
    setRawEvents('');
    setErrorMessage(null);
    setRequestId(null);
    setStats({ events: 0, bytes: 0, ms: 0, startTime: 0 });
    setExecStatus('idle');
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startTimer = (start: number) => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setStats(s => ({ ...s, ms: Date.now() - start }));
    }, 100);
  };

  useEffect(() => () => stopTimer(), []);

  // Keyboard: Ctrl+Enter to execute, Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canExecute) handleExecute();
      }
      if (e.key === 'Escape' && (execStatus === 'running' || execStatus === 'connecting')) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canExecute, execStatus, agentId, userInput]);

  const handleExecute = async () => {
    if (!canExecute) return;

    clearResults();
    const start = Date.now();
    setStats({ events: 0, bytes: 0, ms: 0, startTime: start });
    setExecStatus('connecting');
    startTimer(start);

    const controller = new AbortController();
    abortRef.current = controller;

    const variablesObj = variables.reduce<Record<string, string>>((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value;
      return acc;
    }, {});

    const overrides = configOverridesParsed.ok && configOverridesParsed.obj
      ? (configOverridesParsed.obj as Record<string, unknown>)
      : {};

    const body = {
      user_input: userInput || null,
      variables: Object.keys(variablesObj).length > 0 ? variablesObj : undefined,
      config_overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      stream: streamEnabled,
      debug: debugMode,
    };

    try {
      const res = await fetch(`${config.serverUrl}/api/ai/agents/${agentId.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...config.authHeaders },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          msg = data?.detail || data?.error?.message || data?.message || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const { events, requestId: rid } = parseNdjsonStream(res, controller.signal);
      if (rid) setRequestId(rid);
      setExecStatus('running');

      let eventCount = 0;
      let byteCount = 0;

      for await (const evt of events) {
        eventCount++;
        const line = JSON.stringify(evt, null, 2) + '\n\n';
        byteCount += line.length;
        setRawEvents(prev => prev + line);
        setStats(s => ({ ...s, events: eventCount, bytes: byteCount, ms: Date.now() - start }));

        if (evt.event === 'chunk' && evt.data && typeof evt.data === 'object' && 'text' in evt.data) {
          setTextOutput(prev => prev + (evt.data as { text: string }).text);
        }
        if (evt.event === 'error') {
          const d = evt.data as Record<string, string> | null;
          setErrorMessage(d?.user_message || d?.message || JSON.stringify(d) || 'Stream error');
        }
      }

      setExecStatus(prev => prev === 'running' || prev === 'connecting' ? 'complete' : prev);
    } catch (err) {
      if (controller.signal.aborted) {
        setExecStatus('cancelled');
        toast.info('Cancelled');
      } else {
        const msg = err instanceof Error ? err.message : 'Execution failed';
        setErrorMessage(msg);
        setExecStatus('error');
        toast.error(msg);
      }
    } finally {
      stopTimer();
      setStats(s => ({ ...s, ms: Date.now() - s.startTime }));
      setExecStatus(prev => prev === 'connecting' ? 'error' : prev);
    }
  };

  const handleCancel = async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setExecStatus('cancelled');
    stopTimer();

    if (requestId && config.serverUrl) {
      try {
        await fetch(`${config.serverUrl}/api/ai/cancel/${requestId}`, {
          method: 'POST',
          headers: config.authHeaders,
        });
        toast.info('Cancellation sent to server');
      } catch { /* ignore */ }
    }
  };

  const handleWarm = async () => {
    if (!agentId.trim()) { toast.warning('Enter an Agent ID first'); return; }
    try {
      const res = await fetch(`${config.serverUrl}/api/ai/agents/${agentId.trim()}/warm`, {
        method: 'POST',
      });
      const data = await res.json();
      toast.success(`Warm: ${data.status}`, { description: `agent_id: ${data.agent_id}` });
    } catch (err) {
      toast.error('Warm failed', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  const requestBody = JSON.stringify(
    {
      user_input: userInput || null,
      variables: variables.reduce<Record<string, string>>((a, { key, value }) => { if (key) a[key] = value; return a; }, {}),
      config_overrides: configOverridesParsed.ok ? configOverridesParsed.obj : '(invalid JSON)',
      stream: streamEnabled,
      debug: debugMode,
    },
    null,
    2,
  );

  const isRunning = execStatus === 'connecting' || execStatus === 'running';

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden bg-background">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-3 pt-2 pb-0">
          <ServerBar
            config={config}
            title={
              <div className="flex items-center gap-2 flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
                <h1 className="text-base font-bold">Agent Demo</h1>
              </div>
            }
            actions={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWarm}
                    disabled={!agentId.trim() || isRunning}
                    className="h-7 text-xs px-2.5 gap-1.5"
                  >
                    <Zap className="h-3 w-3" />
                    Warm
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  POST /api/ai/agents/&#123;id&#125;/warm — pre-load agent into cache
                </TooltipContent>
              </Tooltip>
            }
          />
        </div>

        {/* ── Two-panel body ── */}
        <div className="flex-1 min-h-0 px-3 py-2">
          <div className="grid grid-cols-12 gap-2 h-full">

            {/* ── Left: Config ── */}
            <Card className="col-span-4 h-full flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">

                {/* Agent ID */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Agent ID <span className="text-destructive">*</span></Label>
                  <Input
                    value={agentId}
                    onChange={e => setAgentId(e.target.value)}
                    placeholder="UUID or slug (e.g. my-agent)"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {/* User Input */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">User Input</Label>
                  <Textarea
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    placeholder="Message sent to the agent (optional)"
                    className="min-h-[80px] text-xs font-mono resize-y"
                  />
                </div>

                {/* Variables */}
                <KVEditor
                  label="Variables"
                  pairs={variables}
                  onChange={setVariables}
                />

                {/* Config Overrides */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold">Config Overrides</Label>
                    {!configOverridesParsed.ok && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1">Invalid JSON</Badge>
                    )}
                  </div>
                  <Textarea
                    value={configOverridesRaw}
                    onChange={e => setConfigOverridesRaw(e.target.value)}
                    placeholder='{"temperature": 0.7}'
                    className="min-h-[70px] text-xs font-mono resize-y"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="stream"
                      checked={streamEnabled}
                      onCheckedChange={v => setStreamEnabled(v as boolean)}
                    />
                    <Label htmlFor="stream" className="text-xs cursor-pointer">Stream response</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="debug"
                      checked={debugMode}
                      onCheckedChange={v => setDebugMode(v as boolean)}
                    />
                    <Label htmlFor="debug" className="text-xs cursor-pointer">Debug mode</Label>
                  </div>
                </div>
              </div>

              {/* Execute / Cancel / Reset */}
              <div className="flex-shrink-0 p-3 border-t flex flex-col gap-2">
                <div className="flex gap-2">
                  {!isRunning ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleExecute}
                          disabled={!canExecute}
                          className="flex-1 h-8 text-sm gap-2"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Execute
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Ctrl/Cmd + Enter</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      onClick={handleCancel}
                      variant="destructive"
                      className="flex-1 h-8 text-sm gap-2"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Cancel
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
                    <TooltipContent className="text-xs">Clear results</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  POST /api/ai/agents/<span className="font-mono">{agentId || '{agent_id}'}</span>
                </p>
              </div>
            </Card>

            {/* ── Right: Results ── */}
            <Card className="col-span-8 h-full flex flex-col overflow-hidden p-3">

              {/* Results header */}
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Results</span>
                  {statusBadge(execStatus)}
                  {requestId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono cursor-default">
                          req: {requestId.slice(0, 8)}…
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="font-mono text-xs">{requestId}</TooltipContent>
                    </Tooltip>
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
                  <Button size="sm" variant="ghost" onClick={clearResults} disabled={isRunning} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="flex-shrink-0 mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive font-mono">
                  ❌ {errorMessage}
                </div>
              )}

              {/* Tabs */}
              <Tabs defaultValue="text" className="flex-1 flex flex-col overflow-hidden min-h-0">
                <TabsList className="grid grid-cols-3 h-8 flex-shrink-0">
                  <TabsTrigger value="text" className="text-xs">Text Output</TabsTrigger>
                  <TabsTrigger value="events" className="text-xs">Stream Events</TabsTrigger>
                  <TabsTrigger value="request" className="text-xs">Request</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted/30 rounded border min-h-0">
                  <div className="flex justify-end flex-shrink-0 mb-1">
                    <CopyButton text={textOutput} />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {isRunning && !textOutput && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for response…
                      </div>
                    )}
                    {textOutput ? (
                      <pre className="text-xs whitespace-pre-wrap font-sans">{textOutput}</pre>
                    ) : !isRunning ? (
                      <p className="text-xs text-muted-foreground">No text output yet. Execute an agent above.</p>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="events" className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted rounded border min-h-0">
                  <div className="flex justify-end flex-shrink-0 mb-1">
                    <CopyButton text={rawEvents} />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {isRunning && !rawEvents && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Streaming…
                      </div>
                    )}
                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/80">
                      {rawEvents || (!isRunning ? 'No events yet.' : '')}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="request" className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted rounded border min-h-0">
                  <div className="flex justify-end flex-shrink-0 mb-1">
                    <CopyButton text={`POST ${config.serverUrl}/api/ai/agents/${agentId}\n\n${requestBody}`} />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/80">
                      {`POST ${config.serverUrl}/api/ai/agents/${agentId || '{agent_id}'}\n`}
                      {`Authorization: Bearer ${config.authToken || '<token>'}\n`}
                      {`Content-Type: application/json\n\n`}
                      {requestBody}
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
