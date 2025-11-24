import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { checkGuestLimit, recordGuestExecution } from '@/lib/services/guest-limit-service';

/**
 * OPTIMIZED Public API endpoint for executing prompt apps
 * 
 * POST /api/public/apps/{slug}/execute
 * 
 * OPTIMIZATION: This endpoint now only handles logging and task_id generation.
 * All variable validation, resolution, and config building happens CLIENT-SIDE
 * for maximum speed (~10-20ms response time).
 * 
 * Body: {
 *   app_id: string                     // App ID
 *   variables_provided: Record<string, any>  // Original variables from user
 *   variables_used: Record<string, any>      // Validated/processed variables
 *   chat_config: object                // Pre-built chat config (from client)
 *   fingerprint: string                // REQUIRED - Browser fingerprint
 *   metadata?: Record<string, any>     // Additional metadata
 * }
 * 
 * Returns: {
 *   success: boolean
 *   task_id?: string       // Use this to stream results
 *   guest_limit?: {        // For non-authenticated users
 *     allowed: boolean
 *     remaining: number
 *     total_used: number
 *     is_blocked: boolean
 *   }
 *   error?: { type, message, details }
 * }
 */

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const supabase = await createClient();

    try {
        // Parse request body (OPTIMIZED: receives pre-built config from client)
        const body = await request.json();
        const {
            app_id,
            variables_provided = {},
            variables_used = {},
            chat_config,
            fingerprint,
            metadata = {}
        } = body;

        // Validate required fields
        if (!app_id || !chat_config) {
            return NextResponse.json({
                success: false,
                error: {
                    type: 'invalid_request',
                    message: 'Missing required fields: app_id and chat_config'
                }
            }, { status: 400 });
        }

        // Get IP address and user agent
        const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                          request.headers.get('x-real-ip') || 
                          'unknown';
        const user_agent = request.headers.get('user-agent') || 'unknown';
        const referer = request.headers.get('referer') || undefined;

        // Get current user (if authenticated)
        const { data: { user } } = await supabase.auth.getUser();
        
        // REQUIRE fingerprint for non-authenticated users
        const isPublicAccess = !user?.id;
        if (isPublicAccess && !fingerprint) {
            return NextResponse.json({
                success: false,
                error: {
                    type: 'invalid_request',
                    message: 'Fingerprint is required for guest access'
                }
            }, { status: 400 });
        }

        // OPTIMIZATION: Check guest limit (for tracking, not blocking - client already checked)
        let guestLimitResult = null;
        if (isPublicAccess) {
            try {
                guestLimitResult = await checkGuestLimit(supabase, fingerprint!);
                
                // If limit exceeded, still log but return error
                if (!guestLimitResult.allowed || guestLimitResult.is_blocked) {
                    const taskId = uuidv4();
                    
                    // Track failed execution due to guest limit (fire-and-forget)
                    supabase.from('prompt_app_executions').insert({
                        app_id,
                        user_id: null,
                        fingerprint,
                        ip_address,
                        user_agent,
                        task_id: taskId,
                        variables_provided,
                        variables_used,
                        success: false,
                        error_type: 'rate_limit_exceeded',
                        error_message: 'Guest execution limit reached. Please sign up to continue.',
                        referer,
                        metadata: {
                            ...metadata,
                            guest_limit_hit: true,
                            total_used: guestLimitResult.total_used
                        }
                    }).then(({ error }) => {
                        if (error) console.error('Failed to log rate limit:', error);
                    });

                    return NextResponse.json({
                        success: false,
                        guest_limit: guestLimitResult,
                        error: {
                            type: 'guest_limit_exceeded',
                            message: 'You have reached the maximum number of free executions. Please sign up to continue.',
                            details: {
                                remaining: guestLimitResult.remaining,
                                total_used: guestLimitResult.total_used,
                                is_blocked: guestLimitResult.is_blocked
                            }
                        }
                    }, { status: 429 });
                }
            } catch (error) {
                console.error('Guest limit check failed:', error);
                // Fail closed - reject guest access if limit check fails
                return NextResponse.json({
                    success: false,
                    error: {
                        type: 'service_error',
                        message: 'Unable to verify guest access. Please try again or sign up.'
                    }
                }, { status: 503 });
            }
        }

        // OPTIMIZATION: Generate task ID immediately (no more DB fetches or processing!)
        const taskId = uuidv4();

        // OPTIMIZATION: Record execution - FIRE AND FORGET (non-blocking)
        supabase
            .from('prompt_app_executions')
            .insert({
                app_id,
                user_id: user?.id || null,
                fingerprint: isPublicAccess ? fingerprint : null,
                ip_address,
                user_agent,
                task_id: taskId,
                variables_provided,
                variables_used,
                success: true, // Will be updated by backend if it fails
                referer,
                metadata: {
                    ...metadata,
                    is_public_access: isPublicAccess
                }
            })
            .then(({ error: executionError }) => {
                if (executionError) {
                    console.error('Failed to record execution:', executionError);
                }
            });

        // OPTIMIZATION: Record guest execution for tracking (non-authenticated only) - FIRE AND FORGET (non-blocking)
        if (isPublicAccess) {
            recordGuestExecution(supabase, {
                fingerprint: fingerprint!,
                resourceType: 'prompt_app',
                resourceId: app_id,
                resourceName: slug, // Use slug as name for now
                taskId: taskId,
                ipAddress: ip_address,
                userAgent: user_agent,
                referer
            }).catch(error => {
                console.error('Failed to record guest execution:', error);
                // Continue anyway - tracking failure shouldn't break the execution
            });
        }

        // OPTIMIZATION: Return task ID IMMEDIATELY (client already has socket_config built)
        return NextResponse.json({
            success: true,
            task_id: taskId,
            guest_limit: guestLimitResult
        });

    } catch (error) {
        console.error('Execution error:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                type: 'execution_error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }, { status: 500 });
    }
}

// ============================================================================
// Helper Functions (DEPRECATED - moved to client-side for performance)
// ============================================================================

// OPTIMIZATION NOTE: Variable validation and resolution now happen CLIENT-SIDE
// for maximum speed. These functions are kept here commented out for reference
// in case we need to add server-side validation back for security.

/*
function validateVariables(
    providedVariables: Record<string, any>,
    schema: any[]
): {
    validVariables: Record<string, any>;
    validationErrors: string[];
} {
    // ... moved to client-side ...
}

function resolveVariablesInMessages(
    messages: any[],
    variables: Record<string, any>
): any[] {
    // ... moved to client-side ...
}
*/

// ============================================================================
// GET endpoint to fetch public app info (no auth required)
// ============================================================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: app, error } = await supabase
        .from('prompt_apps')
        .select(`
            id,
            slug,
            name,
            tagline,
            description,
            category,
            tags,
            preview_image_url,
            variable_schema,
            layout_config,
            styling_config,
            total_executions,
            success_rate
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (error || !app) {
        return NextResponse.json({
            error: 'App not found'
        }, { status: 404 });
    }

    return NextResponse.json(app);
}

