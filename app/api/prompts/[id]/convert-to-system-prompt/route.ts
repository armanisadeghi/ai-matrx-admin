import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser } from "@/config/admin.config";
import { getCategoryById, validatePromptVariables } from "@/types/system-prompt-categories";

/**
 * Convert a prompt to a system prompt
 * 
 * POST /api/prompts/[id]/convert-to-system-prompt
 * 
 * Body (optional):
 * {
 *   system_prompt_id?: string,  // Custom ID, defaults to kebab-case of name
 *   name?: string,              // Override name
 *   category?: string,          // Override category
 *   display_config?: {...},     // Custom display config
 *   placement_config?: {...}    // Custom placement config
 * }
 */
export async function POST(
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

        // Parse request body (optional overrides)
        const body = await request.json().catch(() => ({}));

        // Fetch the original prompt
        const { data: originalPrompt, error: fetchError } = await supabase
            .from("prompts")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !originalPrompt) {
            return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
        }

        // Generate system_prompt_id (kebab-case from name or use provided)
        const generateSystemPromptId = (name: string): string => {
            return name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        };

        const systemPromptId = body.system_prompt_id || 
            generateSystemPromptId(originalPrompt.name);

        // Check if a system prompt with this ID already exists
        const { data: existingSystemPrompt } = await supabase
            .from("system_prompts")
            .select("id, system_prompt_id")
            .eq("system_prompt_id", systemPromptId)
            .single();

        if (existingSystemPrompt) {
            return NextResponse.json(
                { 
                    error: "System prompt with this ID already exists",
                    details: `A system prompt with ID "${systemPromptId}" already exists. Please choose a different name or ID.`,
                    existing_id: existingSystemPrompt.id
                },
                { status: 409 }
            );
        }

        // Extract variables from messages
        const extractVariables = (messages: any[]): string[] => {
            const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
            const variables = new Set<string>();
            
            messages.forEach(msg => {
                if (msg.content) {
                    let match;
                    while ((match = variableRegex.exec(msg.content)) !== null) {
                        variables.add(match[1]);
                    }
                }
            });
            
            return Array.from(variables);
        };

        const variables = extractVariables(originalPrompt.messages || []);

        // Validate category if provided
        if (body.category && body.category !== 'custom') {
            const category = getCategoryById(body.category);
            if (!category) {
                return NextResponse.json(
                    { error: "Invalid category" },
                    { status: 400 }
                );
            }

            const validation = validatePromptVariables(variables, category);
            if (!validation.valid) {
                return NextResponse.json(
                    { 
                        error: "Prompt variables don't match category requirements",
                        details: `Missing: ${validation.missing.join(', ') || 'none'}. Extra: ${validation.extra.join(', ') || 'none'}`,
                        validation
                    },
                    { status: 400 }
                );
            }
        }

        // Build prompt snapshot
        const promptSnapshot = {
            name: originalPrompt.name,
            description: originalPrompt.description || '',
            messages: originalPrompt.messages || [],
            settings: originalPrompt.settings || {},
            variableDefaults: originalPrompt.variable_defaults || [],
            variables
        };

        // Default display config
        const defaultDisplayConfig = {
            icon: 'Sparkles',
            label: originalPrompt.name,
            tooltip: originalPrompt.description || `Execute ${originalPrompt.name}`
        };

        // Default placement config (disabled by default)
        const defaultPlacementConfig = {
            contextMenu: {
                enabled: false,
                group: 'general',
                priority: 0
            },
            card: {
                enabled: false,
                cardTitle: originalPrompt.name,
                cardDescription: originalPrompt.description || '',
                mode: 'one-shot' as const
            },
            button: {
                enabled: false,
                variant: 'default',
                size: 'default'
            }
        };

        // Create the system prompt
        const { data: newSystemPrompt, error: insertError } = await supabase
            .from("system_prompts")
            .insert({
                system_prompt_id: systemPromptId,
                name: body.name || originalPrompt.name,
                description: originalPrompt.description || `System prompt created from: ${originalPrompt.name}`,
                source_prompt_id: id,
                version: 1,
                prompt_snapshot: promptSnapshot,
                display_config: body.display_config || defaultDisplayConfig,
                placement_config: body.placement_config || defaultPlacementConfig,
                category: body.category || 'general',
                subcategory: null,
                tags: [],
                sort_order: 0,
                required_variables: variables,
                optional_variables: [],
                variable_mappings: {},
                is_active: false,  // Start as inactive - admin must enable
                is_featured: false,
                status: 'draft',   // Start as draft
                metadata: {
                    created_from_prompt_id: id,
                    created_from_prompt_name: originalPrompt.name
                },
                published_by: user.id
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json(
                { 
                    error: "Failed to create system prompt",
                    details: insertError.message || "Database error"
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            system_prompt: newSystemPrompt,
            message: `Successfully converted "${originalPrompt.name}" to system prompt`,
            note: "System prompt created as draft. Enable and configure it in the admin interface."
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

