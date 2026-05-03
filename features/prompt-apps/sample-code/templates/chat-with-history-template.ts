/**
 * Chat with History Template
 *
 * Full chat interface with a collapsible sidebar showing past conversation runs.
 * The sidebar is only useful for authenticated users but degrades gracefully
 * for anonymous visitors (sidebar shows "Sign in to see history").
 *
 * Key behavior:
 * - Full chat interface like the "chat" template
 * - Collapsible left sidebar showing past conversations
 * - Sidebar toggles via a hamburger/history button in the header
 * - Past runs are tracked locally via localStorage keyed by app slug
 * - Each conversation entry shows the first user message and timestamp
 *
 * Display mode: "chat-with-history"
 */

const chatWithHistoryTemplate = `import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Loader2, AlertCircle, Send, RotateCcw, MousePointerClick, PanelLeftOpen, PanelLeftClose, Clock, Plus } from 'lucide-react';
import MarkdownStream from '@/components/MarkdownStream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// Simple localStorage-based history tracker
function useConversationHistory(appName) {
  const storageKey = 'prompt-app-history-' + (appName || 'default').toLowerCase().replace(/\\s+/g, '-');

  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const addEntry = useCallback((entry) => {
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, 50); // Keep last 50
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [storageKey]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  return { history, addEntry, clearHistory };
}

export default function ChatWithHistoryApp({
  onExecute,
  response,
  isStreaming,
  isExecuting,
  error,
  rateLimitInfo,
  appName,
  appTagline,
  conversationId,
  onResetConversation,
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevResponseRef = useRef('');
  const firstMessageRef = useRef('');

  const { history, addEntry, clearHistory } = useConversationHistory(appName);

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, response]);

  // Finalize assistant message when streaming completes
  useEffect(() => {
    if (prevResponseRef.current && !isStreaming && !isExecuting && response) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.isStreaming) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: response, isStreaming: false } : m
          );
        }
        return prev;
      });

      // Save to history on first response completion
      if (firstMessageRef.current && conversationId) {
        addEntry({
          id: conversationId,
          firstMessage: firstMessageRef.current,
          timestamp: new Date().toISOString(),
        });
        firstMessageRef.current = '';
      }

      prevResponseRef.current = '';
    }
  }, [isStreaming, isExecuting, response, conversationId, addEntry]);

  // Focus input
  useEffect(() => {
    if (!isStreaming && !isExecuting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming, isExecuting]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!input.trim() || isExecuting || isStreaming) return;

    const userMsg = input.trim();
    setInput('');
    prevResponseRef.current = userMsg;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: '', isStreaming: true },
    ]);

    if (!hasStarted) {
      setHasStarted(true);
      firstMessageRef.current = userMsg;
      await onExecute({ topic: userMsg });
    } else {
      await onExecute({}, userMsg);
    }
  }, [input, isExecuting, isStreaming, hasStarted, onExecute]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setHasStarted(false);
    prevResponseRef.current = '';
    firstMessageRef.current = '';
    onResetConversation?.();
  };

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return diffMin + 'm ago';
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return diffHr + 'h ago';
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 7) return diffDay + 'd ago';
      return d.toLocaleDateString();
    } catch { return ''; }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div
        className={'flex-shrink-0 border-r border-border bg-muted/30 transition-all duration-200 overflow-hidden '
          + (isSidebarOpen ? 'w-64' : 'w-0')}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">History</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-7 w-7 p-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <div className="py-1">
                {history.map((entry, i) => (
                  <div
                    key={entry.id || i}
                    className={'px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 '
                      + (conversationId === entry.id ? 'border-l-primary bg-accent/30' : 'border-l-transparent')}
                  >
                    <p className="text-sm text-foreground truncate">{entry.firstMessage}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(entry.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clear history */}
          {history.length > 0 && (
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={clearHistory} className="w-full text-xs text-muted-foreground">
                Clear History
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-7 w-7 p-0"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </Button>
            <MessageCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <h1 className="text-sm font-medium text-foreground truncate">{appName || 'Chat'}</h1>
          </div>
          {hasStarted && (
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-7 text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              New
            </Button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!hasStarted ? (
            <div className="h-full flex flex-col items-center justify-center px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MousePointerClick className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {appName || 'Chat'}
              </h2>
              {appTagline && (
                <p className="text-sm text-muted-foreground max-w-md mb-6">{appTagline}</p>
              )}
              <p className="text-xs text-muted-foreground/70">
                Type a message below to start
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="bg-textured">
                      {i === messages.length - 1 && (isStreaming || msg.isStreaming) ? (
                        <>
                          {response ? (
                            <MarkdownStream content={response} />
                          ) : (
                            <div className="flex items-center gap-2 py-3">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span className="text-sm text-muted-foreground">Thinking...</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <MarkdownStream content={msg.content} />
                      )}
                    </div>
                  )}
                </div>
              ))}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error.message}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Rate limit warning */}
        {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
          <div className="flex-shrink-0 px-4">
            <div className="max-w-3xl mx-auto p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-2">
              <p className="text-xs text-amber-800 dark:text-amber-200 text-center">
                {rateLimitInfo.remaining} free {rateLimitInfo.remaining === 1 ? 'use' : 'uses'} remaining.
                <a href="/sign-up" className="underline ml-1 font-semibold">Sign up</a> for more.
              </p>
            </div>
          </div>
        )}

        {/* Chat input */}
        <div className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasStarted ? 'Continue the conversation...' : 'Type your message...'}
                rows={1}
                disabled={isExecuting || isStreaming}
                className="flex-1 resize-none min-h-[42px] max-h-[120px]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isExecuting || isStreaming}
                className="h-[42px] px-3"
              >
                {isExecuting || isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}`;

export default chatWithHistoryTemplate;
