'use client';

import { useState, useMemo } from 'react';
import { Search, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { LuBrain } from 'react-icons/lu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useAgentsContext } from '../context/AgentsContext';
import { DEFAULT_AGENTS } from './AgentSelector';
import type { AgentConfig } from '../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface PromptPickerMenuProps {
    onSelect: (agent: AgentConfig) => void;
    disabled?: boolean;
    selectedAgent?: AgentConfig | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Truncate agent name for trigger button (compact); full name shown via title on hover.
 */
function truncateAgentName(name: string, maxLen = 20): string {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen) + '…';
}

/**
 * PromptPickerMenu - Combined menu for system agents and user prompts
 * 
 * Features:
 * - System agents section (DEFAULT_AGENTS)
 * - User custom agents section (lazy-loaded)
 * - Search functionality
 * - Shows selected agent name (truncated)
 * - Brain icon for all agents
 */
export function PromptPickerMenu({ onSelect, disabled = false, selectedAgent }: PromptPickerMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { userPrompts: prompts, userPromptsLoading: isLoading, userPromptsError: error } = useAgentsContext();

    // Filter system agents based on search query
    const filteredSystemAgents = useMemo(() => {
        if (!searchQuery.trim()) {
            return DEFAULT_AGENTS;
        }

        const query = searchQuery.toLowerCase();
        return DEFAULT_AGENTS.filter(agent =>
            agent.name.toLowerCase().includes(query) ||
            agent.description?.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // Filter user prompts based on search query
    const filteredUserPrompts = useMemo(() => {
        if (!searchQuery.trim()) {
            return prompts;
        }

        const query = searchQuery.toLowerCase();
        return prompts.filter(prompt =>
            prompt.name?.toLowerCase().includes(query) ||
            prompt.description?.toLowerCase().includes(query)
        );
    }, [prompts, searchQuery]);

    const handleSelectSystemAgent = (agent: typeof DEFAULT_AGENTS[0]) => {
        onSelect({
            promptId: agent.promptId,
            name: agent.name,
            description: agent.description,
            variableDefaults: agent.variableDefaults,
        });
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleSelectUserPrompt = (prompt: typeof prompts[0]) => {
        onSelect({
            promptId: prompt.id,
            name: prompt.name || 'Untitled Prompt',
            description: prompt.description || undefined,
            variableDefaults: prompt.variable_defaults || [],
        });
        setIsOpen(false);
        setSearchQuery('');
    };

    const hasSystemResults = filteredSystemAgents.length > 0;
    const hasUserResults = filteredUserPrompts.length > 0;
    const hasResults = hasSystemResults || hasUserResults;

    // Get display name for selected agent
    const displayName = selectedAgent?.name 
        ? truncateAgentName(selectedAgent.name)
        : 'Select Agent';

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    disabled={disabled}
                    className="p-1 rounded-xl flex items-center gap-1 border-2 border-border transition-colors text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm min-w-0 max-w-[200px]"
                    title={selectedAgent?.name ? `Select agent: ${selectedAgent.name}` : 'Select Agent'}
                >
                    <LuBrain size={14} className="flex-shrink-0" />
                    <span className="text-[11px] font-medium truncate" title={selectedAgent?.name}>{displayName}</span>
                    <ChevronDown size={14} className="flex-shrink-0" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="min-w-[280px] w-[360px] max-w-[min(90vw,400px)] p-0" align="start" side="top" sideOffset={8}>
                <div className="flex flex-col max-h-[500px]">
                    {/* Header with Search */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search agents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 text-sm h-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading && prompts.length === 0 ? (
                            <div>
                                {/* Show system agents while loading user prompts */}
                                {hasSystemResults && (
                                    <div>
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            System Agents
                                        </div>
                                        <div className="pb-2">
                                            {filteredSystemAgents.map((agent) => (
                                                <AgentButton
                                                    key={agent.id}
                                                    name={agent.name}
                                                    description={agent.description}
                                                    variableCount={agent.variableDefaults?.length || 0}
                                                    isSelected={selectedAgent?.promptId === agent.promptId}
                                                    onClick={() => handleSelectSystemAgent(agent)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col items-center justify-center py-8 text-gray-500 border-t border-border">
                                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                    <span className="text-xs">Loading your agents...</span>
                                </div>
                            </div>
                        ) : error ? (
                            <div>
                                {/* Show system agents even if user prompts failed */}
                                {hasSystemResults && (
                                    <div>
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            System Agents
                                        </div>
                                        <div className="pb-2">
                                            {filteredSystemAgents.map((agent) => (
                                                <AgentButton
                                                    key={agent.id}
                                                    name={agent.name}
                                                    description={agent.description}
                                                    variableCount={agent.variableDefaults?.length || 0}
                                                    isSelected={selectedAgent?.promptId === agent.promptId}
                                                    onClick={() => handleSelectSystemAgent(agent)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col items-center justify-center py-8 text-red-500 border-t border-border">
                                    <span className="text-xs">Failed to load custom agents</span>
                                </div>
                            </div>
                        ) : !hasResults ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <span className="text-sm">
                                    {searchQuery ? 'No agents found' : 'No agents available'}
                                </span>
                            </div>
                        ) : (
                            <div>
                                {/* System Agents Section */}
                                {hasSystemResults && (
                                    <div>
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            System Agents
                                        </div>
                                        <div className="pb-2">
                                            {filteredSystemAgents.map((agent) => (
                                                <AgentButton
                                                    key={agent.id}
                                                    name={agent.name}
                                                    description={agent.description}
                                                    variableCount={agent.variableDefaults?.length || 0}
                                                    isSelected={selectedAgent?.promptId === agent.promptId}
                                                    onClick={() => handleSelectSystemAgent(agent)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* User Custom Agents Section */}
                                {hasUserResults && (
                                    <div className={hasSystemResults ? 'border-t border-border' : ''}>
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            My Agents
                                        </div>
                                        <div className="pb-2">
                                            {filteredUserPrompts.map((prompt) => (
                                                <AgentButton
                                                    key={prompt.id}
                                                    name={prompt.name || 'Untitled Prompt'}
                                                    description={prompt.description || undefined}
                                                    variableCount={prompt.variable_defaults?.length || 0}
                                                    isSelected={selectedAgent?.promptId === prompt.id}
                                                    onClick={() => handleSelectUserPrompt(prompt)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ============================================================================
// AGENT BUTTON COMPONENT
// ============================================================================

interface AgentButtonProps {
    name: string;
    description?: string;
    variableCount: number;
    isSelected: boolean;
    onClick: () => void;
}

function AgentButton({ name, description, variableCount, isSelected, onClick }: AgentButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
        >
            <div className="flex-shrink-0 mt-0.5">
                <LuBrain size={18} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={name}>
                    {name}
                </div>
                {description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {description}
                    </div>
                )}
                {variableCount > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                        <Sparkles size={11} className="text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                            {variableCount} variable{variableCount > 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>
            {isSelected && (
                <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
            )}
        </button>
    );
}

export default PromptPickerMenu;
