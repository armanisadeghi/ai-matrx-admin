import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { checkGuestLimit, recordGuestExecution } from '@/lib/services/guest-limit-service';

/**
 * Public API endpoint for executing prompt apps
 * 
 * POST /api/public/apps/{slug}/execute
 * 
 * Body: {
 *   variables: Record<string, any>
 *   fingerprint: string    // REQUIRED - Browser fingerprint from FingerprintJS
 *   metadata?: Record<string, any>
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
        // Parse request body
        const body = await request.json();
        const { variables = {}, fingerprint, metadata = {} } = body;

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

        // 1. Fetch the app (published only)
        const { data: app, error: appError } = await supabase
            .from('prompt_apps')
            .select(`
                id,
                prompt_id,
                name,
                variable_schema,
                rate_limit_per_ip,
                rate_limit_window_hours,
                rate_limit_authenticated
            `)
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (appError || !app) {
            return NextResponse.json({
                success: false,
                error: {
                    type: 'execution_error',
                    message: 'App not found or not published'
                }
            }, { status: 404 });
        }

        // 2. Check global guest limit (for non-authenticated users only)
        let guestLimitResult = null;
        if (isPublicAccess) {
            try {
                guestLimitResult = await checkGuestLimit(supabase, fingerprint!);
                
                if (!guestLimitResult.allowed || guestLimitResult.is_blocked) {
                    // Track failed execution due to guest limit
                    await supabase.from('prompt_app_executions').insert({
                        app_id: app.id,
                        user_id: null,
                        fingerprint,
                        ip_address,
                        user_agent,
                        task_id: uuidv4(),
                        variables_provided: variables,
                        variables_used: {},
                        success: false,
                        error_type: 'rate_limit_exceeded',
                        error_message: 'Guest execution limit reached. Please sign up to continue.',
                        referer,
                        metadata: {
                            ...metadata,
                            guest_limit_hit: true,
                            total_used: guestLimitResult.total_used
                        }
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

        // 4. Validate and prepare variables
        const { validVariables, validationErrors } = validateVariables(
            variables,
            app.variable_schema
        );

        if (validationErrors.length > 0) {
            const taskId = uuidv4();
            
            // Track failed execution
            await supabase.from('prompt_app_executions').insert({
                app_id: app.id,
                user_id: user?.id || null,
                fingerprint: isPublicAccess ? fingerprint : null,
                ip_address,
                user_agent,
                task_id: taskId,
                variables_provided: variables,
                variables_used: validVariables,
                success: false,
                error_type: 'invalid_variables',
                error_message: validationErrors.join('; '),
                referer,
                metadata
            });

            return NextResponse.json({
                success: false,
                guest_limit: guestLimitResult,
                error: {
                    type: 'invalid_variables',
                    message: 'Variable validation failed',
                    details: { errors: validationErrors }
                }
            }, { status: 400 });
        }

        // 5. Fetch the prompt (using service role to bypass RLS)
        const { data: prompt, error: promptError } = await supabase
            .from('prompts')
            .select('messages, settings, variable_defaults')
            .eq('id', app.prompt_id)
            .single();

        if (promptError || !prompt) {
            const taskId = uuidv4();
            
            await supabase.from('prompt_app_executions').insert({
                app_id: app.id,
                user_id: user?.id || null,
                fingerprint: isPublicAccess ? fingerprint : null,
                ip_address,
                user_agent,
                task_id: taskId,
                variables_provided: variables,
                variables_used: validVariables,
                success: false,
                error_type: 'execution_error',
                error_message: 'Prompt not found',
                referer,
                metadata
            });

            return NextResponse.json({
                success: false,
                guest_limit: guestLimitResult,
                error: {
                    type: 'execution_error',
                    message: 'Prompt configuration error'
                }
            }, { status: 500 });
        }

        // 6. Resolve variables in messages
        const resolvedMessages = resolveVariablesInMessages(
            prompt.messages,
            validVariables
        );

        // 7. Build chat config for Socket.IO
        const { model_id, ...modelConfig } = prompt.settings;
        
        if (!model_id) {
            const taskId = uuidv4();
            
            await supabase.from('prompt_app_executions').insert({
                app_id: app.id,
                user_id: user?.id || null,
                fingerprint: isPublicAccess ? fingerprint : null,
                ip_address,
                user_agent,
                task_id: taskId,
                variables_provided: variables,
                variables_used: validVariables,
                success: false,
                error_type: 'execution_error',
                error_message: 'No model specified in prompt settings',
                referer,
                metadata
            });

            return NextResponse.json({
                success: false,
                guest_limit: guestLimitResult,
                error: {
                    type: 'execution_error',
                    message: 'Prompt configuration error: no model specified'
                }
            }, { status: 500 });
        }

        const chatConfig = {
            model_id,
            messages: resolvedMessages,
            stream: true,
            ...modelConfig
        };

        // 8. Generate task ID
        const taskId = uuidv4();

        // 9. Record execution (initial state)
        const { error: executionError } = await supabase
            .from('prompt_app_executions')
            .insert({
                app_id: app.id,
                user_id: user?.id || null,
                fingerprint: isPublicAccess ? fingerprint : null,
                ip_address,
                user_agent,
                task_id: taskId,
                variables_provided: variables,
                variables_used: validVariables,
                success: true, // Will be updated by backend if it fails
                referer,
                metadata: {
                    ...metadata,
                    model_id,
                    message_count: resolvedMessages.length,
                    is_public_access: isPublicAccess
                }
            });

        if (executionError) {
            console.error('Failed to record execution:', executionError);
        }

        // 10. Record guest execution for tracking (non-authenticated only)
        if (isPublicAccess) {
            try {
                await recordGuestExecution(supabase, {
                    fingerprint: fingerprint!,
                    resourceType: 'prompt_app',
                    resourceId: app.id,
                    resourceName: app.name,
                    taskId: taskId,
                    ipAddress: ip_address,
                    userAgent: user_agent,
                    referer
                });
            } catch (error) {
                console.error('Failed to record guest execution:', error);
                // Continue anyway - tracking failure shouldn't break the execution
            }
        }

        // 11. Return task ID and socket config for client-side Socket.IO connection
        return NextResponse.json({
            success: true,
            task_id: taskId,
            socket_config: {
                service: 'chat_service',
                task_name: 'direct_chat',
                task_data: { chat_config: chatConfig }
            },
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
// Helper Functions
// ============================================================================

function validateVariables(
    providedVariables: Record<string, any>,
    schema: any[]
): {
    validVariables: Record<string, any>;
    validationErrors: string[];
} {
    const errors: string[] = [];
    const valid: Record<string, any> = {};

    if (!Array.isArray(schema)) {
        // No schema = accept all variables
        return { validVariables: providedVariables, validationErrors: [] };
    }

    // Check required variables
    for (const schemaItem of schema) {
        const { name, required, type, default: defaultValue } = schemaItem;

        if (required && !(name in providedVariables)) {
            if (defaultValue !== undefined) {
                valid[name] = defaultValue;
            } else {
                errors.push(`Missing required variable: ${name}`);
            }
        } else if (name in providedVariables) {
            // Convert value to expected type (or string by default)
            const value = providedVariables[name];
            
            // Normalize 'text' to 'string' for backward compatibility
            const normalizedType = type === 'text' ? 'string' : type;

            // Convert to the expected type - no rejection, just conversion
            if (normalizedType === 'string' || !normalizedType) {
                // Convert everything to string (default behavior for AI prompts)
                valid[name] = String(value);
            } else if (normalizedType === 'number') {
                // Convert to number if schema expects number
                const numValue = typeof value === 'number' ? value : Number(value);
                valid[name] = isNaN(numValue) ? 0 : numValue;
            } else if (normalizedType === 'boolean') {
                // Convert to boolean if schema expects boolean
                valid[name] = Boolean(value);
            } else if (normalizedType === 'array') {
                // Ensure it's an array
                valid[name] = Array.isArray(value) ? value : [value];
            } else {
                // For any other type, just pass it through
                valid[name] = value;
            }
        } else if (defaultValue !== undefined) {
            valid[name] = defaultValue;
        } else {
            // Optional variable not provided, use empty string
            valid[name] = '';
        }
    }

    return { validVariables: valid, validationErrors: errors };
}

function resolveVariablesInMessages(
    messages: any[],
    variables: Record<string, any>
): any[] {
    return messages.map(msg => {
        let content = msg.content;

        // Replace {{variable}} with actual values
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(regex, String(value));
        });

        return {
            role: msg.role,
            content,
            ...(msg.metadata && { metadata: msg.metadata })
        };
    });
}

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

