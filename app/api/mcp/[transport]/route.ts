// MCP Server for external agent access to the feedback system.
//
// Auth — two methods supported:
//   1. Bearer header (Cursor, Claude Code, etc.):
//      { "url": "https://appmatrx.com/api/mcp/mcp", "headers": { "Authorization": "Bearer <key>" } }
//   2. Query-param token (Claude.ai connectors — no custom header support):
//      URL: https://appmatrx.com/api/mcp/mcp?token=<key> 

import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';

import {
    submitFeedback,
    getFeedbackItem,
    getTriageBatch,
    getWorkQueue,
    getComments,
    getReworkItems,
    triageItem,
    addComment,
    resolveWithTesting,
    setAdminDecision,
} from '@/lib/services/agent-feedback.service';

// ---------------------------------------------------------------------------
// MCP Handler — registers all feedback tools
// ---------------------------------------------------------------------------

const handler = createMcpHandler(
    (server) => {
        // =================== Submit ===================

        server.registerTool(
            'submit_feedback',
            {
                title: 'Submit Feedback',
                description:
                    'Create a new feedback item (bug report, feature request, suggestion, or other). ' +
                    'Requires agent_id (your UUID) and agent_name for attribution. ' +
                    'You are strongly encouraged to submit multiple items — one per issue. ' +
                    'If you spot several problems or ideas during a task, submit each as a separate item. ' +
                    'For large tasks, either break them into focused sub-items yourself or submit one ' +
                    'high-level item and note it should be decomposed by a local agent.',
                inputSchema: z.object({
                    agent_id: z.string().uuid().describe('Your agent UUID for tracking'),
                    agent_name: z.string().min(1).describe('Display name for the submitting agent'),
                    feedback_type: z.enum(['bug', 'feature', 'suggestion', 'other']).describe('Type of feedback'),
                    description: z.string().min(1).describe('Detailed description of the feedback'),
                    route: z.string().optional().describe('Route, file path, or component where the issue was found'),
                }),
            },
            async ({ agent_id, agent_name, feedback_type, description, route }) => {
                const result = await submitFeedback(agent_id, agent_name, {
                    feedback_type,
                    description,
                    route,
                });
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        // =================== Read Operations ===================

        server.registerTool(
            'get_feedback_item',
            {
                title: 'Get Feedback Item',
                description: 'Retrieve a single feedback item by its ID.',
                inputSchema: z.object({
                    feedback_id: z.string().uuid().describe('The feedback item UUID'),
                }),
            },
            async ({ feedback_id }) => {
                const result = await getFeedbackItem(feedback_id);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        server.registerTool(
            'get_triage_batch',
            {
                title: 'Get Triage Batch',
                description:
                    'Get a batch of untriaged feedback items with pipeline context. ' +
                    'Returns batch items, pipeline counts, and previews of remaining untriaged items.',
                inputSchema: z.object({
                    batch_size: z.number().int().min(1).max(10).default(3).describe('Number of items to fetch (default 3)'),
                }),
            },
            async ({ batch_size }) => {
                const result = await getTriageBatch(batch_size);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        server.registerTool(
            'get_work_queue',
            {
                title: 'Get Work Queue',
                description: 'Get approved feedback items ordered by work priority. These are items ready to be worked on.',
                inputSchema: z.object({}),
            },
            async () => {
                const result = await getWorkQueue();
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        server.registerTool(
            'get_comments',
            {
                title: 'Get Comments',
                description: 'Get all internal comments for a feedback item.',
                inputSchema: z.object({
                    feedback_id: z.string().uuid().describe('The feedback item UUID'),
                }),
            },
            async ({ feedback_id }) => {
                const result = await getComments(feedback_id);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        server.registerTool(
            'get_rework_items',
            {
                title: 'Get Rework Items',
                description:
                    'Get feedback items that were returned from testing with fail or partial results. ' +
                    'These need to be fixed and resubmitted.',
                inputSchema: z.object({}),
            },
            async () => {
                const result = await getReworkItems();
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        // =================== Triage & Workflow ===================

        server.registerTool(
            'triage_item',
            {
                title: 'Triage Feedback Item',
                description:
                    'Push AI triage analysis to a feedback item. Sets status from "new" to "triaged". ' +
                    'Include your assessment, proposed solution, priority, complexity, affected files, and autonomy score (1-5).',
                inputSchema: z.object({
                    feedback_id: z.string().uuid().describe('The feedback item UUID to triage'),
                    ai_solution_proposal: z.string().optional().describe('Proposed approach to resolve the issue'),
                    ai_suggested_priority: z
                        .enum(['low', 'medium', 'high', 'critical'])
                        .optional()
                        .describe('Suggested priority level'),
                    ai_complexity: z.enum(['simple', 'moderate', 'complex']).optional().describe('Estimated complexity'),
                    ai_estimated_files: z
                        .array(z.string())
                        .optional()
                        .describe('Array of file paths that would need changes'),
                    autonomy_score: z
                        .number()
                        .int()
                        .min(1)
                        .max(5)
                        .optional()
                        .describe('Confidence score 1-5 for auto-approval (4-5 = auto-approve)'),
                    ai_assessment: z.string().optional().describe('Full assessment and analysis of the issue'),
                }),
            },
            async ({ feedback_id, ...triage }) => {
                const result = await triageItem(feedback_id, triage);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        server.registerTool(
            'add_comment',
            {
                title: 'Add Comment',
                description: 'Add an internal comment to a feedback item. Used for agent notes, status updates, etc.',
                inputSchema: z.object({
                    feedback_id: z.string().uuid().describe('The feedback item UUID'),
                    author_name: z.string().min(1).describe('Display name of the comment author'),
                    content: z.string().min(1).describe('The comment content'),
                    author_type: z
                        .enum(['ai_agent', 'admin', 'user'])
                        .default('ai_agent')
                        .describe('Type of author (default: ai_agent)'),
                }),
            },
            async ({ feedback_id, author_type, author_name, content }) => {
                const result = await addComment(feedback_id, author_type, author_name, content);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        server.registerTool(
            'resolve_with_testing',
            {
                title: 'Resolve with Testing',
                description:
                    'Submit a fix for admin testing. This is the agent\'s FINAL action on an item. ' +
                    'Sets status to "awaiting_review". Include what was fixed and how to test it.',
                inputSchema: z.object({
                    feedback_id: z.string().uuid().describe('The feedback item UUID'),
                    resolution_notes: z.string().min(1).describe('Description of what was fixed'),
                    testing_instructions: z.string().optional().describe('Step-by-step testing instructions for the admin'),
                    testing_url: z.string().optional().describe('Direct URL where the fix can be tested'),
                }),
            },
            async ({ feedback_id, resolution_notes, testing_instructions, testing_url }) => {
                const result = await resolveWithTesting(
                    feedback_id,
                    resolution_notes,
                    testing_instructions,
                    testing_url
                );
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        server.registerTool(
            'set_admin_decision',
            {
                title: 'Set Admin Decision',
                description:
                    'Set the admin decision on a triaged feedback item. ' +
                    'Use "approved" for auto-approval (autonomy score 4-5). Optionally set work priority and direction.',
                inputSchema: z.object({
                    feedback_id: z.string().uuid().describe('The feedback item UUID'),
                    decision: z.enum(['pending', 'approved', 'rejected', 'deferred', 'split']).describe('The admin decision'),
                    direction: z.string().optional().describe('Optional direction or instructions for the agent'),
                    work_priority: z.number().int().min(1).optional().describe('Work queue priority (1 = highest)'),
                }),
            },
            async ({ feedback_id, decision, direction, work_priority }) => {
                const result = await setAdminDecision(feedback_id, decision, direction, work_priority);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                };
            }
        );
    },
    {
        capabilities: {},
        serverInfo: {
            name: 'AI Matrx Feedback System',
            version: '1.0.0',
        },
        instructions: [
            'You are connected to the AI Matrx Feedback System — a centralized task and issue tracker for the AI Matrx platform.',
            '',
            '## Your Role',
            'You are encouraged to **actively submit feedback items** whenever you identify bugs, potential improvements,',
            'feature ideas, suggestions, or any issues — whether or not the user explicitly asks you to.',
            'Think of this as your project-wide issue tracker. Every insight matters.',
            '',
            '## When to Submit',
            '- You discover a bug, broken behavior, or inconsistency while working on something else',
            '- You notice code that could be improved, refactored, or optimized',
            '- You identify a missing feature or capability that would benefit the platform',
            '- You see a UX issue, accessibility gap, or design inconsistency',
            '- The user describes a problem — even conversationally — that should be tracked',
            '- You complete a task and realize related follow-up work is needed',
            '- You encounter technical debt, deprecated patterns, or security concerns',
            '',
            '## Submit Early, Submit Often',
            'Do NOT wait for a single perfect issue. Break large observations into **multiple focused items**.',
            'For example, if you notice 3 separate problems on one page, submit 3 separate feedback items —',
            'one per problem. Each item should be independently actionable.',
            '',
            'If you identify a large task, you have two options:',
            '1. Submit it as multiple smaller, focused items yourself (preferred)',
            '2. Submit one high-level item and note that it should be broken into sub-tasks by a local agent',
            '',
            '## Feedback Types',
            '- **bug**: Something is broken or behaving incorrectly',
            '- **feature**: A new capability or functionality request',
            '- **suggestion**: An improvement to existing functionality, UX, performance, or code quality',
            '- **other**: Anything that does not fit the above (technical debt, documentation gaps, etc.)',
            '',
            '## What Happens After Submission',
            'Submitted items enter a triage pipeline where they are analyzed, prioritized, and routed to',
            'agents or developers for resolution. You do not need to fix the issues yourself — just report them.',
            'The admin reviews all submissions and decides what gets worked on.',
            '',
            '## Quality Guidelines',
            '- Write clear, specific descriptions — what is wrong, where, and what the expected behavior should be',
            '- Include the file path, route, or component name in the `route` field when known',
            '- One issue per submission — do not combine unrelated problems into a single item',
            '- Be specific about reproduction steps for bugs',
            '',
            '## Other Tools',
            'Beyond submitting, you can also:',
            '- View existing items and their status (get_feedback_item, get_triage_batch)',
            '- Triage untriaged items with analysis and priority (triage_item)',
            '- Work on approved items from the queue (get_work_queue)',
            '- Add comments and context to items (add_comment)',
            '- Submit completed fixes for admin testing (resolve_with_testing)',
        ].join('\n'),
    },
    {
        basePath: '/api/mcp',
        maxDuration: 60,
        verboseLogs: true,
        disableSse: true,
    }
);

// ---------------------------------------------------------------------------
// Auth wrapper — validates token against AGENT_API_KEY
// Supports two methods (checked in order):
//   1. Bearer token via Authorization header  (Cursor, Claude Code, etc.)
//   2. Query-parameter token via ?token=...   (Claude.ai connectors, which
//      only support authless or OAuth — no custom headers)
// ---------------------------------------------------------------------------

const verifyToken = async (
    req: Request,
    bearerToken?: string
): Promise<AuthInfo | undefined> => {
    const apiKey = process.env.AGENT_API_KEY;

    if (!apiKey) {
        console.error('AGENT_API_KEY environment variable is not configured');
        return undefined;
    }

    // 1. Prefer Bearer token from Authorization header
    if (bearerToken && bearerToken === apiKey) {
        return {
            token: bearerToken,
            scopes: ['feedback'],
            clientId: 'agent',
        };
    }

    // 2. Fall back to ?token= query parameter (for clients that can't send headers)
    try {
        const url = new URL(req.url);
        const queryToken = url.searchParams.get('token');
        if (queryToken && queryToken === apiKey) {
            return {
                token: queryToken,
                scopes: ['feedback'],
                clientId: 'agent-query',
            };
        }
    } catch {
        // URL parsing failed — fall through to rejection
    }

    return undefined;
};

const authHandler = withMcpAuth(handler, verifyToken, {
    required: true,
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
