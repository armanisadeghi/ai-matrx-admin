'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Bot, Search, BookOpen, Code, Image, MessageCircle, Newspaper, Lightbulb, Video, BarChart, ChefHat } from 'lucide-react';
import type { AgentConfig } from '../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface AgentOption {
    id: string;
    name: string;
    description?: string;
    icon?: React.ReactNode;
    promptId: string;
    variableDefaults?: AgentConfig['variableDefaults'];
}

interface AgentSelectorProps {
    agents: AgentOption[];
    selectedAgent: AgentOption | null;
    onSelect: (agent: AgentOption) => void;
    disabled?: boolean;
}

// ============================================================================
// DEFAULT AGENTS
// ============================================================================

export const DEFAULT_AGENTS: AgentOption[] = [
    {
        id: 'general-chat',
        name: 'General Chat',
        description: 'Helpful general assistant.',
        icon: <MessageCircle size={18} />,
        promptId: '35d8f884-5178-4c3e-858d-c5b7adfa186a',
        variableDefaults: [],
    },
    {
        id: 'deep-research',
        name: 'Deep Research',
        description: 'In-depth research and analysis.',
        icon: <Search size={18} />,
        promptId: 'f76a6b8f-b720-4730-87de-606e0bfa0e0c',
        variableDefaults: [
            {
                name: 'topic',
                defaultValue: '',
                required: false,
                helpText: 'The topic to research',
                customComponent: {
                    type: 'textarea',
                },
            },
        ],
    },
    {
        id: 'balanced-news-analysis',
        name: 'Balanced News',
        description: 'Get balanced, multi-perspective analysis of any news topic.',
        icon: <Newspaper size={18} />,
        promptId: '35461e07-bbd1-46cc-81a7-910850815703',
        variableDefaults: [
            {
                name: 'topic',
                defaultValue: '',
                required: true,
                helpText: 'Enter any news topic or recent news clip or data',
                customComponent: {
                    type: 'textarea',
                },
            },
        ],
    },
    {
        id: 'get-ideas',
        name: 'Get Ideas',
        description: 'Generate creative, actionable ideas tailored to your needs.',
        icon: <Lightbulb size={18} />,
        promptId: 'fc8fd18c-9324-48ca-85d4-faf1b1954945',
        variableDefaults: [
            {
                name: 'topic',
                defaultValue: 'Building a powerful ai app for attorneys',
                required: true,
                helpText: 'What topic or concept do you want ideas for?',
                customComponent: {
                    type: 'textarea',
                },
            },
            {
                name: 'creativity_level',
                defaultValue: 'Balanced - Mix of practical and innovative',
                required: false,
                helpText: 'How creative do you want to get?',
                customComponent: {
                    type: 'radio',
                    options: [
                        'Grounded - Practical and immediately actionable',
                        'Balanced - Mix of practical and innovative',
                        'Experimental - Push boundaries and explore wild ideas',
                        'Visionary - Think big, ignore current constraints',
                    ],
                    allowOther: false,
                },
            },
            {
                name: 'idea_count',
                defaultValue: '10-15 (Standard set)',
                required: false,
                helpText: 'How many ideas would you like?',
                customComponent: {
                    type: 'radio',
                    options: [
                        '5-8 (Quick brainstorm)',
                        '10-15 (Standard set)',
                        '20-30 (Comprehensive exploration)',
                        'As many as possible',
                    ],
                    allowOther: true,
                },
            },
        ],
    },
];

// ============================================================================
// AGENT SELECTOR COMPONENT
// ============================================================================

export function AgentSelector({ agents, selectedAgent, onSelect, disabled }: AgentSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = useCallback(
        (agent: AgentOption) => {
            onSelect(agent);
            setIsOpen(false);
        },
        [onSelect]
    );

    const displayAgents = agents.length > 0 ? agents : DEFAULT_AGENTS;
    const selected = selectedAgent || displayAgents[0];

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border hover:bg-accent transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
            >
                <div className="flex items-center gap-2">
                    {selected.icon || <Bot size={18} />}
                    <span className="text-sm font-medium text-foreground">{selected.name}</span>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto bg-popover rounded-xl border border-border shadow-lg z-50">
                        <div className="p-2">
                            {displayAgents.map((agent) => (
                                <button
                                    key={agent.id}
                                    onClick={() => handleSelect(agent)}
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left ${
                                        selected.id === agent.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                >
                                    <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                                        {agent.icon || <Bot size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground">
                                            {agent.name}
                                        </div>
                                        {agent.description && (
                                            <div className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5 line-clamp-2">
                                                {agent.description}
                                            </div>
                                        )}
                                    </div>
                                    {selected.id === agent.id && (
                                        <div className="flex-shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================================================
// RESPONSE MODE BUTTONS (matches authenticated chat style)
// ============================================================================

/**
 * Maps each response mode to a system agent ID.
 * Modes with an agentId will switch the active agent when clicked.
 * Modes without an agentId will console.log (placeholder for future functionality).
 */
export const RESPONSE_MODE_AGENT_MAP: Record<string, string | null> = {
    text:       'ce7c5e71-cbdc-4ed1-8dd9-a7eac930b6b8',
    images:     'ce7c5e71-cbdc-4ed1-8dd9-a7eac930b6b8',
    videos:     '7def859b-6bdc-4867-9471-4b2de7a7e2f7',
    research:   '7a90bace-1c2b-4d40-829d-b6d875573324',
    brainstorm: '01120af5-5511-4fe7-a4f2-586db6f05a4e',
    data:       null,
    recipe:     null,
    code:       null,
};

const RESPONSE_MODES = [
    { id: 'text', label: 'Text', icon: <MessageCircle size={18} /> },
    { id: 'images', label: 'Images', icon: <Image size={18} /> },
    { id: 'videos', label: 'Videos', icon: <Video size={18} /> },
    { id: 'research', label: 'Research', icon: <Search size={18} /> },
    { id: 'brainstorm', label: 'Brainstorm', icon: <Lightbulb size={18} /> },
    { id: 'data', label: 'Data', icon: <BarChart size={18} /> },
    { id: 'recipe', label: 'Recipe', icon: <ChefHat size={18} /> },
    { id: 'code', label: 'Code', icon: <Code size={18} /> },
] as const;

interface ResponseModeButtonsProps {
    disabled?: boolean;
    onModeSelect?: (modeId: string, agentId: string | null) => void;
}

export function ResponseModeButtons({ disabled, onModeSelect }: ResponseModeButtonsProps) {
    const [activeMode, setActiveMode] = useState<string>('text');

    const handleSelect = (modeId: string) => {
        if (disabled) return;
        setActiveMode(modeId);
        const agentId = RESPONSE_MODE_AGENT_MAP[modeId];
        if (agentId) {
            onModeSelect?.(modeId, agentId);
        } else {
            console.log(`[ResponseMode] "${modeId}" selected — no agent mapped yet`);
        }
    };

    return (
        <div className="flex flex-wrap justify-center gap-1">
            {RESPONSE_MODES.map((mode) => {
                const isActive = activeMode === mode.id;
                return (
                    <button
                        key={mode.id}
                        onClick={() => handleSelect(mode.id)}
                        disabled={disabled}
                        className={`py-1 px-2 rounded-full flex items-center border transition-colors ${
                            isActive
                                ? 'bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200 border-zinc-300 dark:border-zinc-700'
                                : 'text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border-zinc-300 dark:border-zinc-700'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={isActive ? 'text-yellow-500' : ''}>
                            {mode.icon}
                        </span>
                        <span className="text-xs ml-1 pr-1">{mode.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default AgentSelector;
