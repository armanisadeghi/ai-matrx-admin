import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser } from "@/config/admin.config";

/**
 * GET /api/system-prompts/[id]/compatible-prompts
 * 
 * Fetch all AI prompts that are compatible with this system prompt's functionality.
 * A prompt is compatible if its variables match the functionality's requirements.
 * 
 * Query params:
 *   - include_all: 'true' to include incompatible prompts with validation info
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();

        // Check if user is authenticated
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is a system admin
        if (!isAdminUser(user.id)) {
            return NextResponse.json(
                { error: "Forbidden: Admin access required" },
                { status: 403 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const includeAll = searchParams.get('include_all') === 'true';

        // Fetch the system prompt
        const { data: systemPrompt, error: systemPromptError } = await supabase
            .from('system_prompts')
            .select('*')
            .eq('id', id)
            .single();

        if (systemPromptError || !systemPrompt) {
            return NextResponse.json(
                { 
                    error: "System prompt not found",
                    details: systemPromptError?.message 
                },
                { status: 404 }
            );
        }

        // Fetch functionality config from database
        if (!systemPrompt.functionality_id) {
            return NextResponse.json(
                { 
                    error: "No functionality defined for this system prompt",
                    details: "System prompt has no functionality_id",
                    system_prompt: {
                        id: systemPrompt.id,
                        system_prompt_id: systemPrompt.system_prompt_id,
                        functionality_id: null
                    }
                },
                { status: 400 }
            );
        }

        const { data: functionality, error: funcError } = await supabase
            .from('system_prompt_functionality_configs')
            .select('*')
            .eq('functionality_id', systemPrompt.functionality_id)
            .single();

        if (funcError || !functionality) {
            return NextResponse.json(
                { 
                    error: "Functionality not found",
                    details: `Functionality "${systemPrompt.functionality_id}" not found in database`,
                    system_prompt: {
                        id: systemPrompt.id,
                        system_prompt_id: systemPrompt.system_prompt_id,
                        functionality_id: systemPrompt.functionality_id
                    }
                },
                { status: 404 }
            );
        }

        // Fetch all prompts (we'll filter for compatibility)
        const { data: allPrompts, error: promptsError } = await supabase
            .from('prompts')
            .select('id, name, description, messages, settings, variable_defaults, updated_at, user_id')
            .order('updated_at', { ascending: false });

        if (promptsError) {
            return NextResponse.json(
                { 
                    error: "Failed to fetch prompts",
                    details: promptsError.message 
                },
                { status: 500 }
            );
        }

        // Extract variables and validate each prompt
        const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
        
        const compatible: any[] = [];
        const incompatible: any[] = [];

        (allPrompts || []).forEach((prompt) => {
            // Extract variables from messages
            const variables = new Set<string>();
            
            prompt.messages?.forEach((msg: any) => {
                if (msg.content) {
                    let match;
                    while ((match = variableRegex.exec(msg.content)) !== null) {
                        variables.add(match[1]);
                    }
                }
            });

            // Build minimal prompt snapshot for validation
            const promptSnapshot = {
                name: prompt.name,
                description: prompt.description || '',
                messages: prompt.messages || [],
                settings: prompt.settings || {},
                variableDefaults: prompt.variable_defaults || [],
                variables: Array.from(variables)
            };

            // Validate against functionality
            const missing = (functionality.required_variables || []).filter((v: string) => !variables.has(v));
            const allowed = [
                ...(functionality.required_variables || []),
                ...(functionality.optional_variables || [])
            ];
            const extra = Array.from(variables).filter(v => !allowed.includes(v));
            
            const validation = {
                valid: missing.length === 0,
                missing,
                extra
            };

            const promptInfo = {
                id: prompt.id,
                name: prompt.name,
                description: prompt.description,
                variables: Array.from(variables),
                updated_at: prompt.updated_at,
                is_current: prompt.id === systemPrompt.source_prompt_id,
                validation: {
                    valid: validation.valid,
                    missing: validation.missing,
                    extra: validation.extra
                }
            };

            if (validation.valid) {
                compatible.push(promptInfo);
            } else {
                incompatible.push(promptInfo);
            }
        });

        // Sort compatible prompts: current first, then by updated_at
        compatible.sort((a, b) => {
            if (a.is_current && !b.is_current) return -1;
            if (!a.is_current && b.is_current) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        const response: any = {
            system_prompt: {
                id: systemPrompt.id,
                system_prompt_id: systemPrompt.system_prompt_id,
                name: systemPrompt.name,
                functionality_id: systemPrompt.functionality_id,
                source_prompt_id: systemPrompt.source_prompt_id,
                current_version: systemPrompt.version
            },
            functionality: {
                id: functionality.id,
                name: functionality.name,
                description: functionality.description,
                required_variables: functionality.requiredVariables,
                optional_variables: functionality.optionalVariables || [],
                placement_types: functionality.placementTypes
            },
            compatible: compatible,
            total_compatible: compatible.length,
            total_prompts: allPrompts?.length || 0
        };

        if (includeAll) {
            response.incompatible = incompatible;
            response.total_incompatible = incompatible.length;
        }

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error in compatible-prompts endpoint:', error);
        return NextResponse.json(
            { 
                error: "Internal server error",
                details: error?.message || 'Unknown error',
                stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            },
            { status: 500 }
        );
    }
}

