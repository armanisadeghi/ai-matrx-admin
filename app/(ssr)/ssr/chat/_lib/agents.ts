// app/(ssr)/ssr/chat/_lib/agents.ts
//
// Hardcoded agent data for server-side rendering.
// This avoids any DB call for the initial render. The client will
// hydrate the full agent config from the database after mount.

import type { WelcomeAgent } from '../_components/ChatWelcomeServer';

/** General Chat — the default agent. No DB call needed. */
export const GENERAL_CHAT_AGENT: WelcomeAgent = {
    promptId: '6b6b4e45-4699-4860-8dea-d8a60e07d69a',
    name: 'General Chat',
    description: 'Helpful general assistant.',
    variableDefaults: [],
};

/** Hardcoded built-in agents for instant SSR. */
export const BUILTIN_AGENTS: Record<string, WelcomeAgent> = {
    '6b6b4e45-4699-4860-8dea-d8a60e07d69a': GENERAL_CHAT_AGENT,
    '3ca61863-43cf-49cd-8da5-7e0a4b192867': {
        promptId: '3ca61863-43cf-49cd-8da5-7e0a4b192867',
        name: 'Custom Chat',
        description: 'A warm, chatty assistant with customizable model & settings.',
        variableDefaults: [],
    },
    'f76a6b8f-b720-4730-87de-606e0bfa0e0c': {
        promptId: 'f76a6b8f-b720-4730-87de-606e0bfa0e0c',
        name: 'Deep Research',
        description: 'In-depth research and analysis.',
        variableDefaults: [
            { name: 'topic', defaultValue: '', required: false },
        ],
    },
    '35461e07-bbd1-46cc-81a7-910850815703': {
        promptId: '35461e07-bbd1-46cc-81a7-910850815703',
        name: 'Balanced News',
        description: 'Get balanced, multi-perspective analysis of any news topic.',
        variableDefaults: [],
    },
    'fc8fd18c-9324-48ca-85d4-faf1b1954945': {
        promptId: 'fc8fd18c-9324-48ca-85d4-faf1b1954945',
        name: 'Get Ideas',
        description: 'Generate creative, actionable ideas tailored to your needs.',
        variableDefaults: [],
    },
};

/**
 * Resolve an agent by ID. Returns hardcoded data for built-in agents,
 * or a minimal stub for unknown agents (client will fetch full config).
 */
export function resolveAgentForSSR(agentId: string): WelcomeAgent {
    const builtin = BUILTIN_AGENTS[agentId];
    if (builtin) return builtin;

    // Unknown agent — return a stub. The client island will fetch
    // full config from the database and hydrate the display name.
    return {
        promptId: agentId,
        name: '', // Empty — client will resolve from DB
        description: undefined,
        variableDefaults: [],
    };
}
