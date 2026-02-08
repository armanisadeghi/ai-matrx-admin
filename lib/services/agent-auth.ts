// Authentication helper for external agent API endpoints.
// Validates bearer token against AGENT_API_KEY env var.

import { NextResponse } from 'next/server';

interface AuthResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate the agent API key from the Authorization header.
 * Expects: Authorization: Bearer <AGENT_API_KEY>
 */
export function validateAgentApiKey(request: Request): AuthResult {
    const apiKey = process.env.AGENT_API_KEY;

    if (!apiKey) {
        console.error('AGENT_API_KEY environment variable is not configured');
        return { valid: false, error: 'Server misconfiguration: API key not set' };
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
        return { valid: false, error: 'Missing Authorization header' };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return { valid: false, error: 'Invalid Authorization header format. Expected: Bearer <token>' };
    }

    const token = parts[1];

    if (token !== apiKey) {
        return { valid: false, error: 'Invalid API key' };
    }

    return { valid: true };
}

/**
 * Helper to return a 401 JSON response for unauthorized requests.
 */
export function unauthorizedResponse(error: string): NextResponse {
    return NextResponse.json({ success: false, error }, { status: 401 });
}
