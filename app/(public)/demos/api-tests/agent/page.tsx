"use client";

import React, { useState, useCallback } from "react";
import { Bot, Loader2, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBackendApi } from "@/hooks/useBackendApi";

interface AgentStreamEvent {
    event: string;
    data: any;
}

export default function AgentDemoPage() {
    const api = useBackendApi();
    
    const [promptId, setPromptId] = useState("a6617ebd-1114-4cc0-84b7-6b0c9ee235c8");
    const [conversationId, setConversationId] = useState(`conv-${Date.now()}`);
    const [userInput, setUserInput] = useState("Hello! Can you help me with something?");
    const [isLoading, setIsLoading] = useState(false);
    const [streamOutput, setStreamOutput] = useState("");
    const [textOutput, setTextOutput] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleExecute = async () => {
        setIsLoading(true);
        setError(null);
        setStreamOutput("");
        setTextOutput("");

        try {
            const requestBody = {
                prompt_id: promptId,
                conversation_id: conversationId,
                user_input: userInput,
                is_builtin: false,
                stream: true,
                debug: true,
            };

            const response = await api.post('/api/agent/execute', requestBody);

            if (!response.body) {
                throw new Error('No response body');
            }

            // Process streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const event: AgentStreamEvent = JSON.parse(line);
                            
                            setStreamOutput(prev => prev + JSON.stringify(event, null, 2) + '\n\n');

                            if (event.event === 'chunk' && typeof event.data === 'string') {
                                setTextOutput(prev => prev + event.data);
                            }

                            if (event.event === 'error') {
                                const errMsg = event.data.user_visible_message || event.data.message || JSON.stringify(event.data);
                                setError(errMsg);
                            }
                        } catch (err) {
                            console.warn('[Agent Demo] Failed to parse line:', line.substring(0, 100));
                        }
                    }
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Agent execution failed';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewConversation = () => {
        setConversationId(`conv-${Date.now()}`);
        setStreamOutput("");
        setTextOutput("");
        setError(null);
    };

    return (
        <div className="h-screen bg-textured flex flex-col overflow-hidden">
            {/* Compact Header + Input Bar */}
            <div className="flex-shrink-0 border-b border-border bg-white dark:bg-zinc-900 px-4 py-2.5 space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        <h1 className="text-sm font-semibold text-foreground">Agent Execution</h1>
                    </div>
                    <div className="flex-1 grid grid-cols-[1fr_1fr_2fr] gap-2 items-end">
                        <div>
                            <Label htmlFor="promptId" className="text-[10px] text-muted-foreground leading-none mb-0.5 block">Prompt ID</Label>
                            <Input
                                id="promptId"
                                type="text"
                                placeholder="Prompt UUID"
                                value={promptId}
                                onChange={(e) => setPromptId(e.target.value)}
                                disabled={isLoading}
                                className="h-8 text-sm font-mono"
                            />
                        </div>
                        <div>
                            <Label htmlFor="conversationId" className="text-[10px] text-muted-foreground leading-none mb-0.5 block">Conversation ID</Label>
                            <div className="flex gap-1">
                                <Input
                                    id="conversationId"
                                    type="text"
                                    value={conversationId}
                                    onChange={(e) => setConversationId(e.target.value)}
                                    disabled={isLoading}
                                    className="h-8 text-sm font-mono"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleNewConversation}
                                    disabled={isLoading}
                                    title="New Conversation"
                                    className="h-8 w-8 flex-shrink-0"
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <Label htmlFor="userInput" className="text-[10px] text-muted-foreground leading-none mb-0.5 block">User Input</Label>
                                <Input
                                    id="userInput"
                                    placeholder="Your message to the agent..."
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    disabled={isLoading}
                                    className="h-8 text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && promptId.trim() && userInput.trim() && !isLoading) {
                                            e.preventDefault();
                                            handleExecute();
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                onClick={handleExecute}
                                disabled={!promptId.trim() || !userInput.trim() || isLoading}
                                className="h-8 px-4 flex-shrink-0"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Send className="w-3.5 h-3.5" />
                                )}
                                <span className="ml-1.5 text-xs">{isLoading ? 'Running...' : 'Execute'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Response Section - fills remaining space */}
            <div className="flex-1 min-h-0 p-3">
                {(textOutput || streamOutput || error) ? (
                    <div className="grid grid-cols-2 gap-3 h-full">
                        {/* Text Output */}
                        <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg overflow-hidden flex flex-col">
                            <div className="border-b border-border px-3 py-1.5 flex-shrink-0">
                                <h3 className="text-xs font-semibold text-foreground">Text Output</h3>
                            </div>
                            <div className="flex-1 min-h-0 p-3 overflow-y-auto">
                                {error ? (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                                        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                                    </div>
                                ) : textOutput ? (
                                    <pre className="whitespace-pre-wrap text-xs text-foreground/80 bg-muted p-3 rounded border border-border overflow-y-auto">
                                        {textOutput}
                                    </pre>
                                ) : isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-xs text-center py-12">No output yet</p>
                                )}
                            </div>
                        </div>

                        {/* Stream Events */}
                        <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg overflow-hidden flex flex-col">
                            <div className="border-b border-border px-3 py-1.5 flex-shrink-0">
                                <h3 className="text-xs font-semibold text-foreground">Stream Events</h3>
                            </div>
                            <div className="flex-1 min-h-0 p-3 overflow-y-auto">
                                {streamOutput ? (
                                    <pre className="text-[11px] font-mono text-foreground/80 bg-muted p-3 rounded border border-border whitespace-pre-wrap">
                                        {streamOutput}
                                    </pre>
                                ) : isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-xs text-center py-12">No events yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <Bot className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Execute an agent to see results</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
