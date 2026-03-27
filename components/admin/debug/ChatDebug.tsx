// components/admin/debug/ChatDebug.tsx
// Live debug panel for the SSR chat route.
// Reads exclusively from Redux — no local state, no hooks, no fetch.
'use client';

import { useAppSelector } from '@/lib/redux/hooks';
import { selectActiveServer, selectResolvedBaseUrl, selectActiveServerHealth, selectRecentApiCalls } from '@/lib/redux/slices/apiConfigSlice';
import { selectSession, selectMessages, selectUIState, selectIsStreaming, selectAllToolCalls } from '@/features/cx-conversation/redux/selectors';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react';

// Pull sessionId from activeChatSlice
const selectSessionId = (state: { activeChat: { sessionId: string | null } }) =>
    state.activeChat.sessionId;

const selectSelectedAgent = (state: { activeChat: { selectedAgent: { promptId: string; name: string; tools?: string[]; configFetched?: boolean } } }) =>
    state.activeChat.selectedAgent;

const selectUseBlockMode = (state: { activeChat: { useBlockMode: boolean } }) =>
    state.activeChat.useBlockMode;

function HealthDot({ status }: { status: string }) {
    if (status === 'healthy') return <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />;
    if (status === 'unhealthy') return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    if (status === 'checking') return <Loader2 className="h-3.5 w-3.5 text-yellow-500 shrink-0 animate-spin" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
}

function Row({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4 py-1 border-b border-slate-800 last:border-0">
            <span className="text-xs text-slate-400 shrink-0 w-36">{label}</span>
            <span className={`text-xs text-right truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

export default function ChatDebug() {
    const sessionId = useAppSelector(selectSessionId);
    const selectedAgent = useAppSelector(selectSelectedAgent);
    const useBlockMode = useAppSelector(selectUseBlockMode);
    const activeServer = useAppSelector(selectActiveServer);
    const resolvedUrl = useAppSelector(selectResolvedBaseUrl);
    const serverHealth = useAppSelector(selectActiveServerHealth);
    const recentCalls = useAppSelector(selectRecentApiCalls);

    // Session-scoped state — guard with empty fallback when no session
    const session = useAppSelector(s => sessionId ? selectSession(s, sessionId) : undefined);
    const messages = useAppSelector(s => sessionId ? selectMessages(s, sessionId) : []);
    const uiState = useAppSelector(s => sessionId ? selectUIState(s, sessionId) : null);
    const isStreaming = useAppSelector(s => sessionId ? selectIsStreaming(s, sessionId) : false);
    const toolCalls = useAppSelector(s => sessionId ? selectAllToolCalls(s, sessionId) : []);

    const chatCalls = recentCalls.filter(c => c.path.includes('/chat') || c.path.includes('/message') || c.path.includes('/stream'));

    return (
        <div className="space-y-5 text-slate-100">

            {/* ── API Config ─────────────────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">API Config</h3>
                <div className="bg-slate-900 rounded p-3 space-y-0.5">
                    <Row label="Active Server" value={
                        <Badge variant="outline" className="text-xs">{activeServer}</Badge>
                    } mono={false} />
                    <Row label="Backend URL" value={resolvedUrl ?? <span className="text-red-400">not configured</span>} />
                    <Row label="Health" value={
                        <div className="flex items-center gap-1.5">
                            <HealthDot status={serverHealth.status} />
                            <span>{serverHealth.status}</span>
                            {serverHealth.latencyMs != null && (
                                <span className="text-slate-500">({serverHealth.latencyMs}ms)</span>
                            )}
                        </div>
                    } mono={false} />
                    {serverHealth.error && (
                        <Row label="Health Error" value={<span className="text-red-400">{serverHealth.error}</span>} />
                    )}
                    {serverHealth.lastCheckedAt && (
                        <Row label="Last Checked" value={new Date(serverHealth.lastCheckedAt).toLocaleTimeString()} />
                    )}
                </div>
            </section>

            {/* ── Active Agent ───────────────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Active Agent</h3>
                <div className="bg-slate-900 rounded p-3 space-y-0.5">
                    <Row label="Name" value={selectedAgent.name || '—'} />
                    <Row label="Prompt ID" value={selectedAgent.promptId || '—'} />
                    <Row label="Config Fetched" value={String(selectedAgent.configFetched ?? false)} />
                    <Row label="Tools" value={
                        selectedAgent.tools?.length
                            ? selectedAgent.tools.join(', ')
                            : <span className="text-slate-500">none</span>
                    } />
                    <Row label="Block Mode" value={String(useBlockMode)} />
                </div>
            </section>

            {/* ── Session ────────────────────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Session</h3>
                {!sessionId || !session ? (
                    <div className="bg-slate-900 rounded p-3 text-xs text-slate-500 italic">
                        No active session — welcome screen
                    </div>
                ) : (
                    <div className="bg-slate-900 rounded p-3 space-y-0.5">
                        <Row label="Session ID" value={sessionId} />
                        <Row label="Status" value={
                            <span className={
                                session.status === 'streaming' ? 'text-blue-400' :
                                session.status === 'error' ? 'text-red-400' :
                                session.status === 'ready' ? 'text-green-400' :
                                'text-slate-300'
                            }>
                                {session.status}
                                {isStreaming && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
                            </span>
                        } mono={false} />
                        <Row label="Conversation ID" value={session.conversationId ?? <span className="text-slate-500">not yet persisted</span>} />
                        <Row label="Agent ID" value={session.agentId} />
                        <Row label="API Mode" value={session.apiMode} />
                        <Row label="Messages" value={String(messages.length)} />
                        <Row label="Tool Calls" value={String(toolCalls.length)} />
                        <Row label="Show Debug Info" value={String(uiState?.showDebugInfo ?? false)} />
                        <Row label="Model Override" value={uiState?.modelOverride ?? <span className="text-slate-500">none</span>} />
                        {session.error && (
                            <Row label="Error" value={<span className="text-red-400">{session.error}</span>} />
                        )}
                    </div>
                )}
            </section>

            {/* ── Recent Chat API Calls ──────────────────────────────────── */}
            <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Recent Chat API Calls ({chatCalls.length})
                </h3>
                {chatCalls.length === 0 ? (
                    <div className="bg-slate-900 rounded p-3 text-xs text-slate-500 italic">
                        No chat API calls logged yet
                    </div>
                ) : (
                    <ScrollArea className="h-48">
                        <div className="bg-slate-900 rounded p-2 space-y-1">
                            {chatCalls.map(call => (
                                <div key={call.id} className="flex items-center gap-2 text-xs font-mono py-1 px-2 rounded bg-slate-800">
                                    <span className={
                                        call.status === 'success' ? 'text-green-400' :
                                        call.status === 'error' ? 'text-red-400' :
                                        'text-yellow-400'
                                    }>
                                        {call.status === 'success' ? '✓' : call.status === 'error' ? '✗' : '…'}
                                    </span>
                                    <span className="text-slate-400 w-12 shrink-0">{call.method}</span>
                                    <span className="flex-1 truncate text-slate-200">{call.path}</span>
                                    {call.durationMs != null && (
                                        <span className="text-slate-500 shrink-0">{call.durationMs}ms</span>
                                    )}
                                    {call.httpStatus != null && (
                                        <span className={`shrink-0 ${call.httpStatus < 400 ? 'text-slate-400' : 'text-red-400'}`}>
                                            {call.httpStatus}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </section>

        </div>
    );
}
