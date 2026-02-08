// REST API endpoint for external agent access to the feedback system.
// Single endpoint with action dispatch — agents POST with { action: "...", ...params }.
// Auth: Authorization: Bearer <AGENT_API_KEY> header.

import { NextRequest, NextResponse } from 'next/server';
import { validateAgentApiKey, unauthorizedResponse } from '@/lib/services/agent-auth';
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

type ActionHandler = (body: Record<string, unknown>) => Promise<{ success: boolean; error?: string; data?: unknown }>;

const ACTION_HANDLERS: Record<string, ActionHandler> = {
    submit: async (body) => {
        const { agent_id, agent_name, feedback_type, description, route } = body as {
            agent_id: string;
            agent_name: string;
            feedback_type: 'bug' | 'feature' | 'suggestion' | 'other';
            description: string;
            route?: string;
        };

        if (!agent_id || !agent_name || !feedback_type || !description) {
            return { success: false, error: 'Missing required fields: agent_id, agent_name, feedback_type, description' };
        }

        return submitFeedback(agent_id, agent_name, { feedback_type, description, route });
    },

    get_item: async (body) => {
        const { feedback_id } = body as { feedback_id: string };
        if (!feedback_id) return { success: false, error: 'Missing required field: feedback_id' };
        return getFeedbackItem(feedback_id);
    },

    get_batch: async (body) => {
        const { batch_size } = body as { batch_size?: number };
        return getTriageBatch(batch_size ?? 3);
    },

    get_queue: async () => {
        return getWorkQueue();
    },

    get_comments: async (body) => {
        const { feedback_id } = body as { feedback_id: string };
        if (!feedback_id) return { success: false, error: 'Missing required field: feedback_id' };
        return getComments(feedback_id);
    },

    get_rework: async () => {
        return getReworkItems();
    },

    triage: async (body) => {
        const {
            feedback_id,
            ai_solution_proposal,
            ai_suggested_priority,
            ai_complexity,
            ai_estimated_files,
            autonomy_score,
            ai_assessment,
        } = body as {
            feedback_id: string;
            ai_solution_proposal?: string;
            ai_suggested_priority?: 'low' | 'medium' | 'high' | 'critical';
            ai_complexity?: 'simple' | 'moderate' | 'complex';
            ai_estimated_files?: string[];
            autonomy_score?: number;
            ai_assessment?: string;
        };

        if (!feedback_id) return { success: false, error: 'Missing required field: feedback_id' };
        return triageItem(feedback_id, {
            ai_solution_proposal,
            ai_suggested_priority,
            ai_complexity,
            ai_estimated_files,
            autonomy_score,
            ai_assessment,
        });
    },

    comment: async (body) => {
        const { feedback_id, author_type, author_name, content } = body as {
            feedback_id: string;
            author_type?: 'user' | 'admin' | 'ai_agent';
            author_name: string;
            content: string;
        };

        if (!feedback_id || !author_name || !content) {
            return { success: false, error: 'Missing required fields: feedback_id, author_name, content' };
        }

        return addComment(feedback_id, author_type ?? 'ai_agent', author_name, content);
    },

    resolve: async (body) => {
        const { feedback_id, resolution_notes, testing_instructions, testing_url } = body as {
            feedback_id: string;
            resolution_notes: string;
            testing_instructions?: string;
            testing_url?: string;
        };

        if (!feedback_id || !resolution_notes) {
            return { success: false, error: 'Missing required fields: feedback_id, resolution_notes' };
        }

        return resolveWithTesting(feedback_id, resolution_notes, testing_instructions, testing_url);
    },

    decision: async (body) => {
        const { feedback_id, decision, direction, work_priority } = body as {
            feedback_id: string;
            decision: 'pending' | 'approved' | 'rejected' | 'deferred' | 'split';
            direction?: string;
            work_priority?: number;
        };

        if (!feedback_id || !decision) {
            return { success: false, error: 'Missing required fields: feedback_id, decision' };
        }

        return setAdminDecision(feedback_id, decision, direction, work_priority);
    },
};

const VALID_ACTIONS = Object.keys(ACTION_HANDLERS);

export async function POST(request: NextRequest) {
    // Authenticate
    const auth = validateAgentApiKey(request);
    if (!auth.valid) {
        return unauthorizedResponse(auth.error || 'Unauthorized');
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON body' },
            { status: 400 }
        );
    }

    const action = body.action as string | undefined;

    if (!action || !VALID_ACTIONS.includes(action)) {
        return NextResponse.json(
            {
                success: false,
                error: `Invalid or missing action. Valid actions: ${VALID_ACTIONS.join(', ')}`,
            },
            { status: 400 }
        );
    }

    // Execute the action
    try {
        const result = await ACTION_HANDLERS[action](body);
        const status = result.success ? 200 : 400;
        return NextResponse.json(result, { status });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        console.error(`Agent feedback action "${action}" failed:`, err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
