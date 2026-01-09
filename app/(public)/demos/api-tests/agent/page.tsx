"use client";

import React, { useState, useCallback } from "react";
import { Bot, Loader2, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
        <div className="min-h-screen bg-textured p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                        <Bot className="w-8 h-8" />
                        Agent Execution
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Execute AI agents with streaming responses
                    </p>
                </div>

                {/* Input Section */}
                <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg p-6 mb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="promptId" className="text-xs text-gray-500 mb-1">Prompt ID</Label>
                            <Input
                                id="promptId"
                                type="text"
                                placeholder="Prompt UUID"
                                value={promptId}
                                onChange={(e) => setPromptId(e.target.value)}
                                disabled={isLoading}
                                className="text-base font-mono"
                            />
                        </div>
                        <div>
                            <Label htmlFor="conversationId" className="text-xs text-gray-500 mb-1">Conversation ID</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="conversationId"
                                    type="text"
                                    value={conversationId}
                                    onChange={(e) => setConversationId(e.target.value)}
                                    disabled={isLoading}
                                    className="text-base font-mono"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleNewConversation}
                                    disabled={isLoading}
                                    title="New Conversation"
                                >
                                    <Zap className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="userInput" className="text-xs text-gray-500 mb-1">User Input</Label>
                        <Textarea
                            id="userInput"
                            placeholder="Your message to the agent..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            disabled={isLoading}
                            rows={3}
                            className="text-base resize-none"
                        />
                    </div>

                    <Button 
                        onClick={handleExecute} 
                        disabled={!promptId.trim() || !userInput.trim() || isLoading}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Execute Agent
                            </>
                        )}
                    </Button>
                </div>

                {/* Response Section */}
                {(textOutput || streamOutput || error) && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Text Output */}
                        <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg overflow-hidden">
                            <div className="border-b border-border px-6 py-3">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Text Output</h3>
                            </div>
                            <div className="p-6">
                                {error ? (
                                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                    </div>
                                ) : textOutput ? (
                                    <div className="prose dark:prose-invert max-w-none">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-4 rounded border border-gray-200 dark:border-zinc-700 max-h-[600px] overflow-y-auto">
                                            {textOutput}
                                        </pre>
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-12">No output yet</p>
                                )}
                            </div>
                        </div>

                        {/* Stream Events */}
                        <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg overflow-hidden">
                            <div className="border-b border-border px-6 py-3">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Stream Events</h3>
                            </div>
                            <div className="p-6">
                                {streamOutput ? (
                                    <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-4 rounded border border-gray-200 dark:border-zinc-700 max-h-[600px] overflow-y-auto whitespace-pre-wrap">
                                        {streamOutput}
                                    </pre>
                                ) : isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-12">No events yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
