import type { AgentConfig } from '../context/DEPRECATED-ChatContext';
import type { MinimalPrompt } from '../context/DEPRECATED-AgentsContext';
import { DEFAULT_AGENTS } from '../components/AgentSelector';

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
    promptId: DEFAULT_AGENTS[0].promptId,
    name: DEFAULT_AGENTS[0].name,
    description: DEFAULT_AGENTS[0].description,
    variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
};

/**
 * Resolves an AgentConfig from an agent ID by checking:
 * 1. Hardcoded DEFAULT_AGENTS (system agents)
 * 2. prompt_builtins (public system prompts)
 * 3. User prompts (personal prompts)
 */
export function resolveAgentFromId(
    agentId: string | null,
    userPrompts: MinimalPrompt[] = [],
    builtinPrompts: MinimalPrompt[] = [],
): AgentConfig | null {
    if (!agentId) return null;

    const systemAgent = DEFAULT_AGENTS.find(a => a.promptId === agentId);
    if (systemAgent) {
        return {
            promptId: systemAgent.promptId,
            name: systemAgent.name,
            description: systemAgent.description,
            variableDefaults: systemAgent.variableDefaults,
        };
    }

    const builtinAgent = builtinPrompts.find(p => p.id === agentId);
    if (builtinAgent) {
        return {
            promptId: builtinAgent.id,
            name: builtinAgent.name || 'Untitled',
            description: builtinAgent.description || undefined,
            variableDefaults: builtinAgent.variable_defaults || undefined,
        };
    }

    const userAgent = userPrompts.find(p => p.id === agentId);
    if (userAgent) {
        return {
            promptId: userAgent.id,
            name: userAgent.name || 'Untitled',
            description: userAgent.description || undefined,
            variableDefaults: userAgent.variable_defaults || undefined,
        };
    }

    return null;
}
