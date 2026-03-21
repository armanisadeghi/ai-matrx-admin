/**
 * Chat Template
 *
 * Full chat interface from the start. Input pinned at bottom, messages flow up.
 * Like a ChatGPT-style interface scoped to the app's agent/prompt.
 *
 * Key behavior:
 * - First message triggers onExecute(variables) where variables come from the message
 * - Follow-up messages use onExecute({}, userInput) to continue the conversation
 * - Messages are tracked locally for display while conversation state lives in the renderer
 * - "New Chat" button resets via onResetConversation
 *
 * Display mode: "chat"
 */

const chatTemplate = `import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Loader2, AlertCircle, Send, RotateCcw, Sparkles } from 'lucide-react';
import MarkdownStream from '@/components/MarkdownStream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ChatApp({
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
  const messagesEndRef = useRef(null);
  const prevResponseRef = useRef('');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, response]);

  // When streaming completes, finalize the assistant message
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

  // Focus input when ready
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

    // Add user message and placeholder assistant message
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: '', isStreaming: true },
    ]);

    if (!hasStarted) {
      setHasStarted(true);
      // First message — send as variable
      await onExecute({ topic: userMsg });
    } else {
      // Follow-up — continue conversation
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <h1 className="text-sm font-medium text-foreground truncate">{appName || 'Chat'}</h1>
        </div>
        {hasStarted && (
          <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-7 text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            New Chat
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {!hasStarted ? (
          /* Welcome state */
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {appName || 'Chat'}
            </h2>
            {appTagline && (
              <p className="text-sm text-muted-foreground max-w-md mb-6">{appTagline}</p>
            )}
            <p className="text-xs text-muted-foreground/70">
              Type a message below to get started
            </p>
          </div>
        ) : (
          /* Message list */
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

            {/* Error display */}
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

      {/* Input area — always visible */}
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
  );
}`;

export default chatTemplate;
