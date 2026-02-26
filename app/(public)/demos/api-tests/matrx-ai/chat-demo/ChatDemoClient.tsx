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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import { useServerConfig } from '../_shared/useServerConfig';
import { ServerBar } from '../_shared/ServerBar';

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = 'system' | 'user' | 'assistant';
interface Message { role: Role; content: string; }
type ExecStatus = 'idle' | 'connecting' | 'running' | 'complete' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1" disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => null);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

function statusBadge(status: ExecStatus) {
  const map: Record<ExecStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    idle:       { label: 'Idle',       variant: 'outline' },
    connecting: { label: 'Connecting', variant: 'secondary' },
    running:    { label: 'Running',    variant: 'default' },
    complete:   { label: 'Complete',   variant: 'secondary' },
    error:      { label: 'Error',      variant: 'destructive' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant} className="text-[10px] h-5 px-1.5">{label}</Badge>;
}

const DEFAULT_MESSAGES: Message[] = [
  {
    role: 'system',
    content: "You are a helpful assistant. Today's date is " + new Date().toLocaleDateString() + '.',
  },
  {
    role: 'user',
    content: 'Hello! What can you help me with today?',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatDemoClient() {
  const config = useServerConfig();

  // Model + params
  const [modelId, setModelId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [temperature, setTemperature] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);

  // Execution
  const [execStatus, setExecStatus] = useState<ExecStatus>('idle');
  const [textOutput, setTextOutput] = useState('');
  const [rawEvents, setRawEvents] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({ events: 0, bytes: 0, ms: 0, startTime: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = execStatus === 'connecting' || execStatus === 'running';
  const canRun = messages.length > 0 && !isRunning;

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  const startTimer = (t: number) => {
    stopTimer();
    timerRef.current = setInterval(() => setStats(s => ({ ...s, ms: Date.now() - t })), 100);
  };
  useEffect(() => () => stopTimer(), []);

  const clearResults = () => {
    setTextOutput('');
    setRawEvents('');
    setErrorMessage(null);
    setStats({ events: 0, bytes: 0, ms: 0, startTime: 0 });
    setExecStatus('idle');
  };

  // Message management
  const addMessage = () => {
    const lastRole = messages.at(-1)?.role ?? 'user';
    setMessages(prev => [...prev, { role: lastRole === 'user' ? 'assistant' : 'user', content: '' }]);
  };
  const removeMessage = (i: number) => setMessages(prev => prev.filter((_, idx) => idx !== i));
  const updateMessage = (i: number, field: keyof Message, val: string) => {
    setMessages(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val } as Message;
      return next;
    });
  };

  // Build request body
  const buildBody = () => {
    const body: Record<string, unknown> = {
      messages,
      stream: streamEnabled,
      debug: debugMode,
    };
    if (modelId.trim()) body.ai_model_id = modelId.trim();
    if (conversationId.trim()) body.conversation_id = conversationId.trim();
    if (systemInstruction.trim()) body.system_instruction = systemInstruction.trim();
    const temp = parseFloat(temperature);
    if (!isNaN(temp)) body.temperature = temp;
    const mtok = parseInt(maxTokens, 10);
    if (!isNaN(mtok)) body.max_output_tokens = mtok;
    return body;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (canRun) handleRun(); }
      if (e.key === 'Escape' && isRunning) handleCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canRun, isRunning]);

  const handleRun = async () => {
    if (!canRun) return;
    clearResults();
    const start = Date.now();
    setStats({ events: 0, bytes: 0, ms: 0, startTime: start });
    setExecStatus('connecting');
    startTimer(start);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${config.serverUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...config.authHeaders },
        body: JSON.stringify(buildBody()),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const d = await res.json(); msg = d?.detail || d?.error?.message || d?.message || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const { events } = parseNdjsonStream(res, controller.signal);
      setExecStatus('running');

      let eventCount = 0, byteCount = 0;
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
          setErrorMessage(d?.user_message || d?.message || 'Stream error');
        }
      }

      setExecStatus(prev => prev === 'running' || prev === 'connecting' ? 'complete' : prev);
    } catch (err) {
      if (controller.signal.aborted) {
        setExecStatus('idle');
        toast.info('Cancelled');
      } else {
        const msg = err instanceof Error ? err.message : 'Request failed';
        setErrorMessage(msg);
        setExecStatus('error');
        toast.error(msg);
      }
    } finally {
      stopTimer();
      setStats(s => ({ ...s, ms: Date.now() - s.startTime }));
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

        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-2 pb-0">
          <ServerBar
            config={config}
            title={
              <div className="flex items-center gap-2 flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h1 className="text-base font-bold">Chat Demo</h1>
              </div>
            }
          />
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 px-3 py-2">
          <div className="grid grid-cols-12 gap-2 h-full">

            {/* Left: Config */}
            <Card className="col-span-4 h-full flex flex-col overflow-hidden">

              {/* Model + ID */}
              <div className="flex-shrink-0 p-3 space-y-2 border-b">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Model ID</Label>
                  <Input
                    value={modelId}
                    onChange={e => setModelId(e.target.value)}
                    placeholder="e.g. gpt-4o or claude-3-5-sonnet-latest"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Conversation ID <span className="font-normal">(optional)</span>
                  </Label>
                  <Input
                    value={conversationId}
                    onChange={e => setConversationId(e.target.value)}
                    placeholder="Leave blank — server will generate"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Settings (collapsible) */}
              <Collapsible open={showSettings} onOpenChange={setShowSettings} className="flex-shrink-0">
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 border-b hover:bg-muted/50 text-left">
                  <span className="text-xs font-semibold">Settings</span>
                  {showSettings
                    ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  }
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 space-y-3 border-b">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Temperature</Label>
                        <Input value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="0.7" className="h-7 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Tokens</Label>
                        <Input value={maxTokens} onChange={e => setMaxTokens(e.target.value)} placeholder="2048" className="h-7 text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">System Instruction (override)</Label>
                      <Textarea
                        value={systemInstruction}
                        onChange={e => setSystemInstruction(e.target.value)}
                        placeholder="Overrides system message in the messages array"
                        className="min-h-[60px] text-xs resize-y"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox id="stream-chat" checked={streamEnabled} onCheckedChange={v => setStreamEnabled(v as boolean)} />
                        <Label htmlFor="stream-chat" className="text-xs cursor-pointer">Stream</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="debug-chat" checked={debugMode} onCheckedChange={v => setDebugMode(v as boolean)} />
                        <Label htmlFor="debug-chat" className="text-xs cursor-pointer">Debug</Label>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Messages ({messages.length})</Label>
                  <Button size="sm" variant="outline" onClick={addMessage} className="h-6 text-xs px-2 gap-1">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {messages.map((msg, i) => (
                    <Card key={i} className="p-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Select value={msg.role} onValueChange={v => updateMessage(i, 'role', v)}>
                          <SelectTrigger className="h-6 text-xs w-28 flex-shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system" className="text-xs">System</SelectItem>
                            <SelectItem value="user" className="text-xs">User</SelectItem>
                            <SelectItem value="assistant" className="text-xs">Assistant</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">{i + 1}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => removeMessage(i)} className="h-6 w-6 p-0 ml-auto">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        value={msg.content}
                        onChange={e => updateMessage(i, 'content', e.target.value)}
                        placeholder={`${msg.role} message…`}
                        className="min-h-[70px] text-xs font-mono resize-y"
                      />
                    </Card>
                  ))}
                </div>
              </div>

              {/* Run button */}
              <div className="flex-shrink-0 p-3 border-t flex gap-2">
                {!isRunning ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleRun} disabled={!canRun} className="flex-1 h-8 gap-2 text-sm">
                        <Play className="h-3.5 w-3.5" /> Run Test
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Ctrl/Cmd + Enter</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button onClick={handleCancel} variant="destructive" className="flex-1 h-8 gap-2 text-sm">
                    <Square className="h-3.5 w-3.5" /> Cancel
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={clearResults} disabled={isRunning} className="h-8 w-8 p-0">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Clear results</TooltipContent>
                </Tooltip>
              </div>
            </Card>

            {/* Right: Results */}
            <Card className="col-span-8 h-full flex flex-col overflow-hidden p-3">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Results</span>
                  {statusBadge(execStatus)}
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

              {errorMessage && (
                <div className="flex-shrink-0 mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive font-mono">
                  ❌ {errorMessage}
                </div>
              )}

              <Tabs defaultValue="text" className="flex-1 flex flex-col overflow-hidden min-h-0">
                <TabsList className="grid grid-cols-3 h-8 flex-shrink-0">
                  <TabsTrigger value="text" className="text-xs">Text Output</TabsTrigger>
                  <TabsTrigger value="events" className="text-xs">Stream Events</TabsTrigger>
                  <TabsTrigger value="request" className="text-xs">Request Body</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted/30 rounded border min-h-0">
                  <div className="flex justify-end flex-shrink-0 mb-1"><CopyButton text={textOutput} /></div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {isRunning && !textOutput && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for response…
                      </div>
                    )}
                    {textOutput
                      ? <pre className="text-xs whitespace-pre-wrap font-sans">{textOutput}</pre>
                      : !isRunning ? <p className="text-xs text-muted-foreground">No output yet. Run the test above.</p>
                      : null
                    }
                  </div>
                </TabsContent>

                <TabsContent value="events" className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted rounded border min-h-0">
                  <div className="flex justify-end flex-shrink-0 mb-1"><CopyButton text={rawEvents} /></div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {isRunning && !rawEvents && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Streaming…
                      </div>
                    )}
                    <pre className="text-[11px] font-mono whitespace-pre-wrap">{rawEvents || (!isRunning ? 'No events yet.' : '')}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="request" className="flex-1 flex flex-col overflow-hidden mt-2 p-3 bg-muted rounded border min-h-0">
                  <div className="flex justify-end flex-shrink-0 mb-1">
                    <CopyButton text={`POST ${config.serverUrl}/api/ai/chat\n\n${requestBodyStr}`} />
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/80">
                      {`POST ${config.serverUrl}/api/ai/chat\n`}
                      {`Authorization: Bearer ${config.authToken || '<token>'}\n`}
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
