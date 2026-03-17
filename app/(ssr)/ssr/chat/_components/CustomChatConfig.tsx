'use client';

/**
 * CustomChatConfig — Configuration UI for "Direct Chat" mode.
 *
 * Allows users to start a conversation with custom settings:
 * - Model selection from the registry
 * - System prompt
 * - Temperature, max tokens, and other generation parameters
 *
 * Renders as a compact card on the welcome screen. When submitted,
 * it switches the workspace to chat mode with the configured settings.
 */

import { useState, useEffect, useCallback } from 'react';
import { Settings2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
    selectAvailableModels,
    selectModelOptions,
    fetchAvailableModels,
} from '@/lib/redux/slices/modelRegistrySlice';
import type { ChatModeConfig } from '@/lib/redux/chatConversations/types';

// ============================================================================
// PROPS
// ============================================================================

interface CustomChatConfigProps {
    /** Called when the user activates custom chat mode with their config */
    onActivate: (config: ChatModeConfig) => void;
    /** Whether a custom chat session is already active */
    isActive?: boolean;
    /** Compact mode (less padding, for embedded layouts) */
    compact?: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// ============================================================================
// COMPONENT
// ============================================================================

export default function CustomChatConfig({ onActivate, isActive = false, compact = false }: CustomChatConfigProps) {
    const dispatch = useAppDispatch();
    const modelOptions = useAppSelector(selectModelOptions);
    const availableModels = useAppSelector(selectAvailableModels);

    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState<number | null>(null);
    const [webSearch, setWebSearch] = useState(false);

    // Ensure models are loaded
    useEffect(() => {
        if (availableModels.length === 0) {
            dispatch(fetchAvailableModels());
        }
    }, [dispatch, availableModels.length]);

    const handleActivate = useCallback(() => {
        const config: ChatModeConfig = {
            aiModelId: selectedModel,
            ...(systemPrompt.trim() ? { systemInstruction: systemPrompt.trim() } : {}),
            temperature,
            ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
            ...(webSearch ? { internalWebSearch: true } : {}),
        };
        onActivate(config);
    }, [selectedModel, systemPrompt, temperature, maxTokens, webSearch, onActivate]);

    if (isActive) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-primary font-medium truncate">
                    Custom Chat — {modelOptions.find(m => m.value === selectedModel)?.label ?? selectedModel}
                </span>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border border-border bg-card/60 backdrop-blur-sm ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
            {/* Header — always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left group"
            >
                <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-sm font-medium text-foreground">Direct Chat</span>
                    <span className="text-xs text-muted-foreground">— custom model & settings</span>
                </div>
                {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
            </button>

            {/* Expandable config */}
            {isExpanded && (
                <div className="mt-3 space-y-3">
                    {/* Model selector */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            {modelOptions.length > 0 ? (
                                modelOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))
                            ) : (
                                <option value={DEFAULT_MODEL}>Claude Sonnet 4</option>
                            )}
                        </select>
                    </div>

                    {/* System prompt */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                            System Prompt <span className="text-muted-foreground/60">(optional)</span>
                        </label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="You are a helpful assistant..."
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    {/* Temperature + Max Tokens row */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Temperature ({temperature.toFixed(1)})
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Max Tokens</label>
                            <input
                                type="number"
                                value={maxTokens ?? ''}
                                onChange={(e) => setMaxTokens(e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Auto"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>

                    {/* Web search toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={webSearch}
                            onChange={(e) => setWebSearch(e.target.checked)}
                            className="rounded border-border accent-primary"
                        />
                        <span className="text-sm text-foreground">Enable web search</span>
                    </label>

                    {/* Activate button */}
                    <Button
                        onClick={handleActivate}
                        className="w-full"
                        size="sm"
                    >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Start Direct Chat
                    </Button>
                </div>
            )}
        </div>
    );
}
