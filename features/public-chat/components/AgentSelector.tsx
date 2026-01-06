'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Bot, Sparkles, Search, BookOpen, Code, Image } from 'lucide-react';
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
    variables?: AgentConfig['variables'];
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
        description: 'A helpful AI assistant for general questions',
        icon: <Bot size={18} />,
        promptId: '35d8f884-5178-4c3e-858d-c5b7adfa186a',
        variables: [],
    },
    {
        id: 'deep-research',
        name: 'Deep Research',
        description: 'In-depth research and analysis on any topic',
        icon: <Search size={18} />,
        promptId: 'f76a6b8f-b720-4730-87de-606e0bfa0e0c',
        variables: [
            {
                name: 'topic',
                type: 'string',
                required: false,
                description: 'The topic to research',
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
                className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
            >
                <div className="flex items-center gap-2">
                    {selected.icon || <Bot size={18} />}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{selected.name}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg z-50">
                        <div className="p-2">
                            {displayAgents.map((agent) => (
                                <button
                                    key={agent.id}
                                    onClick={() => handleSelect(agent)}
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left ${
                                        selected.id === agent.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                >
                                    <div className="flex-shrink-0 mt-0.5 text-gray-600 dark:text-gray-400">
                                        {agent.icon || <Bot size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {agent.name}
                                        </div>
                                        {agent.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                {agent.description}
                                            </div>
                                        )}
                                        {agent.variables && agent.variables.length > 0 && (
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <Sparkles size={12} className="text-amber-500" />
                                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                                    {agent.variables.length} variable{agent.variables.length > 1 ? 's' : ''}
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
                            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className={selected.id === agent.id ? 'text-white' : 'text-gray-500 dark:text-gray-400'}>
                        {agent.icon || <Bot size={16} />}
                    </span>
                    <span className="text-sm font-medium">{agent.name}</span>
                </button>
            ))}
        </div>
    );
}

export default AgentSelector;
