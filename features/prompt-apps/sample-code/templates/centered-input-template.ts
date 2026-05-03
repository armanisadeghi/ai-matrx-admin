/**
 * Centered Input Template
 *
 * Large centered input (landing-page style) with the app name as a hero heading.
 * After the first message is sent, the view transforms into a full chat interface
 * with messages flowing up and input pinned at the bottom.
 *
 * Key behavior:
 * - Initial state: centered hero layout with prominent input
 * - After first message: seamless transition to chat mode
 * - Follow-up messages use onExecute({}, userInput) to continue the conversation
 * - Clean, minimal aesthetic focused on the input experience
 *
 * Display mode: "centered-input"
 */

const centeredInputTemplate = `import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PartyPopper, Loader2, AlertCircle, Send, ArrowUp, RotateCcw } from 'lucide-react';
import MarkdownStream from '@/components/MarkdownStream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function CenteredInputApp({
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
  const inputRef = useRef(null);
  const chatInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevResponseRef = useRef('');

  // Scroll on new messages
  useEffect(() => {
    if (hasStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, response, hasStarted]);

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
      prevResponseRef.current = '';
    }
  }, [isStreaming, isExecuting, response]);

  // Focus chat input after streaming completes
  useEffect(() => {
    if (hasStarted && !isStreaming && !isExecuting && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [hasStarted, isStreaming, isExecuting]);

  // Auto-focus centered input on mount
  useEffect(() => {
    if (!hasStarted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasStarted]);

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
    onResetConversation?.();
  };

  // ── CENTERED INPUT MODE ──
  if (!hasStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-8 text-center">
          {/* Hero section */}
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <PartyPopper className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
              {appName || 'Ask anything'}
            </h1>
            {appTagline && (
              <p className="text-base text-muted-foreground max-w-lg mx-auto">
                {appTagline}
              </p>
            )}
          </div>

          {/* Input area */}
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to know?"
              rows={3}
              disabled={isExecuting}
              className="w-full resize-none pr-14 text-base rounded-2xl border-border/60 focus:border-primary/50 shadow-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!input.trim() || isExecuting}
              className="absolute bottom-3 right-3 h-8 w-8 p-0 rounded-full"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>

          {/* Rate limit */}
          {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {rateLimitInfo.remaining} free {rateLimitInfo.remaining === 1 ? 'use' : 'uses'} remaining.
              <a href="/sign-up" className="underline ml-1 font-semibold">Sign up</a> for more.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CHAT MODE ──
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <PartyPopper className="w-4 h-4 text-primary flex-shrink-0" />
          <h1 className="text-sm font-medium text-foreground truncate">{appName || 'Chat'}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-7 text-xs">
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Start Over
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
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
      </div>

      {/* Rate limit */}
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
              ref={chatInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Continue the conversation..."
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
  );
}`;

export default centeredInputTemplate;
