import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Public API endpoint for executing prompt apps
 * 
 * POST /api/public/apps/{slug}/execute
 * 
 * Body: {
 *   variables: Record<string, any>
 *   fingerprint?: string  // Browser fingerprint for rate limiting
 *   metadata?: Record<string, any>
 * }
 * 
 * Returns: {
 *   success: boolean
 *   task_id?: string       // Use this to stream results
 *   rate_limit: {
 *     allowed: boolean
 *     remaining: number
 *     reset_at: string
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

        // 2. Check rate limit
        const rateLimitResult = await checkRateLimit(
            supabase,
            app.id,
            user?.id,
            fingerprint,
            ip_address
        );

        if (!rateLimitResult.allowed) {
            // Track failed execution due to rate limit
            await supabase.from('prompt_app_executions').insert({
                app_id: app.id,
                user_id: user?.id,
                fingerprint,
                ip_address,
                user_agent,
                task_id: uuidv4(), // Dummy task ID
                variables_provided: variables,
                variables_used: {},
                success: false,
                error_type: 'rate_limit_exceeded',
                error_message: 'Rate limit exceeded. Please try again later.',
                referer,
                metadata
            });

            return NextResponse.json({
                success: false,
                rate_limit: rateLimitResult,
                error: {
                    type: 'rate_limit_exceeded',
                    message: `Rate limit exceeded. ${rateLimitResult.remaining} executions remaining. Resets at ${rateLimitResult.reset_at}.`,
                    details: {
                        reset_at: rateLimitResult.reset_at,
                        is_blocked: rateLimitResult.is_blocked
                    }
                }
            }, { status: 429 });
        }

        // 3. Update rate limit counter
        await updateRateLimitCounter(
            supabase,
            app.id,
            user?.id,
            fingerprint,
            ip_address,
            app.rate_limit_window_hours
        );

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
                user_id: user?.id,
                fingerprint,
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
                rate_limit: rateLimitResult,
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
                user_id: user?.id,
                fingerprint,
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
                rate_limit: rateLimitResult,
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
                user_id: user?.id,
                fingerprint,
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
                rate_limit: rateLimitResult,
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
                user_id: user?.id,
                fingerprint,
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
                    message_count: resolvedMessages.length
                }
            });

        if (executionError) {
            console.error('Failed to record execution:', executionError);
        }

        // 10. Create task in ai_tasks table (for polling to retrieve results)
        const { error: taskError } = await supabase
            .from('ai_tasks')
            .insert({
                id: taskId,
                user_id: user?.id,
                task_id: taskId,
                service: 'chat_service',
                task_name: 'direct_chat',
                model_id,
                request_data: chatConfig,
                status: 'pending',
                metadata: {
                    app_id: app.id,
                    fingerprint,
                    source: 'prompt_app'
                }
            });

        if (taskError) {
            console.error('Failed to create ai_task:', taskError);
            return NextResponse.json({
                success: false,
                rate_limit: rateLimitResult,
                error: {
                    type: 'execution_error',
                    message: 'Failed to initialize task'
                }
            }, { status: 500 });
        }

        // 11. Submit task to Socket.IO backend
        try {
            const { submitTaskToBackend } = await import('../../lib/submit-task-to-backend');
            await submitTaskToBackend({
                task_id: taskId,
                service: 'chat_service',
                task_name: 'direct_chat',
                task_data: { chat_config: chatConfig },
                user_id: user?.id,
                metadata: {
                    app_id: app.id,
                    fingerprint,
                    source: 'prompt_app'
                }
            });
        } catch (submitError) {
            console.error('Failed to submit to backend:', submitError);
            // Don't fail the request - task is in database, polling will show pending state
        }

        // 12. Return task ID for client polling
        return NextResponse.json({
            success: true,
            task_id: taskId,
            rate_limit: rateLimitResult
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

async function checkRateLimit(
    supabase: any,
    appId: string,
    userId?: string,
    fingerprint?: string,
    ipAddress?: string
) {
    const { data, error } = await supabase
        .rpc('check_rate_limit', {
            p_app_id: appId,
            p_user_id: userId || null,
            p_fingerprint: fingerprint || null,
            p_ip_address: ipAddress || null
        });

    if (error || !data || data.length === 0) {
        console.error('Rate limit check error:', error);
        // Default to allowing on error (fail open)
        return {
            allowed: true,
            remaining: 5,
            reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            is_blocked: false
        };
    }

    return data[0];
}

async function updateRateLimitCounter(
    supabase: any,
    appId: string,
    userId?: string,
    fingerprint?: string,
    ipAddress?: string,
    windowHours: number = 24
) {
    // Find or create rate limit record
    let record;

    if (userId) {
        const { data } = await supabase
            .from('prompt_app_rate_limits')
            .select('*')
            .eq('app_id', appId)
            .eq('user_id', userId)
            .single();
        record = data;
    } else if (fingerprint) {
        const { data } = await supabase
            .from('prompt_app_rate_limits')
            .select('*')
            .eq('app_id', appId)
            .eq('fingerprint', fingerprint)
            .single();
        record = data;
    } else if (ipAddress) {
        const { data } = await supabase
            .from('prompt_app_rate_limits')
            .select('*')
            .eq('app_id', appId)
            .eq('ip_address', ipAddress)
            .single();
        record = data;
    }

    if (!record) {
        // Create new record
        await supabase.from('prompt_app_rate_limits').insert({
            app_id: appId,
            user_id: userId || null,
            fingerprint: fingerprint || null,
            ip_address: ipAddress || null,
            execution_count: 1,
            window_start_at: new Date().toISOString()
        });
    } else {
        // Check if window expired
        const windowStart = new Date(record.window_start_at);
        const windowEnd = new Date(windowStart.getTime() + windowHours * 60 * 60 * 1000);
        const now = new Date();

        if (now > windowEnd) {
            // Reset window
            await supabase
                .from('prompt_app_rate_limits')
                .update({
                    execution_count: 1,
                    window_start_at: now.toISOString(),
                    last_execution_at: now.toISOString()
                })
                .eq('id', record.id);
        } else {
            // Increment counter
            await supabase
                .from('prompt_app_rate_limits')
                .update({
                    execution_count: record.execution_count + 1,
                    last_execution_at: now.toISOString()
                })
                .eq('id', record.id);
        }
    }
}

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
            // Basic type validation
            const value = providedVariables[name];
            const actualType = Array.isArray(value) ? 'array' : typeof value;

            if (type && actualType !== type) {
                errors.push(`Variable ${name} should be ${type} but got ${actualType}`);
            } else {
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

