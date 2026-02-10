'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Bot, Sparkles, Search, BookOpen, Code, Image, MessageCircle, Newspaper, Lightbulb } from 'lucide-react';
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
                                        {agent.variableDefaults && agent.variableDefaults.length > 0 && (
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <Sparkles size={12} className="text-amber-500" />
                                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                                    {agent.variableDefaults.length} variable{agent.variableDefaults.length > 1 ? 's' : ''}
                                                </span>
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
// AGENT ACTION BUTTONS (Alternative UI)
// ============================================================================

interface AgentActionButtonsProps {
    agents: AgentOption[];
    selectedAgent: AgentOption | null;
    onSelect: (agent: AgentOption) => void;
    disabled?: boolean;
}

export function AgentActionButtons({ agents, selectedAgent, onSelect, disabled }: AgentActionButtonsProps) {
    const displayAgents = agents.length > 0 ? agents : DEFAULT_AGENTS;
    const selected = selectedAgent || displayAgents[0];

    return (
        <div className="flex flex-wrap justify-center gap-2">
            {displayAgents.map((agent) => (
                <button
                    key={agent.id}
                    onClick={() => !disabled && onSelect(agent)}
                    disabled={disabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        selected.id === agent.id
                            ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-card border-border text-foreground/80 hover:bg-accent'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className={selected.id === agent.id ? 'text-white' : 'text-muted-foreground dark:text-gray-400'}>
                        {agent.icon || <Bot size={16} />}
                    </span>
                    <span className="text-sm font-medium">{agent.name}</span>
                </button>
            ))}
        </div>
    );
}

export default AgentSelector;
