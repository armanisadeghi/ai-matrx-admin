import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser } from "@/config/admin.config";

/**
 * Convert a prompt to a system prompt (NEW SCHEMA)
 * 
 * POST /api/prompts/[id]/convert-to-system-prompt
 * 
 * Body (required):
 * {
 *   prompt_id: string,          // Human-readable ID (e.g., "debug-and-fix")
 *   category_id: string,        // UUID of category (determines placement_type)
 *   label?: string,             // Override label (defaults to prompt name)
 *   icon_name?: string,         // Lucide icon name (defaults to 'Sparkles')
 *   description?: string,       // Override description
 *   tags?: string[],            // Optional tags
 *   metadata?: object           // Optional metadata
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

        // Parse request body (NEW SCHEMA: prompt_id and category_id required)
        const body = await request.json().catch(() => ({}));

        // Validate required fields
        if (!body.prompt_id) {
            return NextResponse.json(
                { error: "prompt_id is required" },
                { status: 400 }
            );
        }

        if (!body.category_id) {
            return NextResponse.json(
                { error: "category_id is required (UUID of the category)" },
                { status: 400 }
            );
        }

        // Fetch the original prompt
        const { data: originalPrompt, error: fetchError } = await supabase
            .from("prompts")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !originalPrompt) {
            return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
        }

        // Verify category exists
        const { data: category, error: categoryError } = await supabase
            .from("system_prompt_categories_new")
            .select("id, category_id, placement_type, label")
            .eq("id", body.category_id)
            .single();

        if (categoryError || !category) {
            return NextResponse.json(
                { error: "Invalid category_id - category not found" },
                { status: 400 }
            );
        }

        // Check if a system prompt with this ID already exists
        const { data: existingSystemPrompt } = await supabase
            .from("system_prompts_new")
            .select("id, prompt_id")
            .eq("prompt_id", body.prompt_id)
            .single();

        if (existingSystemPrompt) {
            return NextResponse.json(
                { 
                    error: "System prompt with this ID already exists",
                    details: `A system prompt with ID "${body.prompt_id}" already exists. Please choose a different ID.`,
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

        // Build prompt snapshot (NEW SCHEMA: simplified)
        const promptSnapshot = {
            name: originalPrompt.name,
            description: originalPrompt.description || '',
            messages: originalPrompt.messages || [],
            settings: originalPrompt.settings || {},
            variableDefaults: originalPrompt.variable_defaults || [],
            variables
        };

        // Create the system prompt (NEW SCHEMA)
        console.log('Inserting system prompt:', {
            prompt_id: body.prompt_id,
            label: body.label || originalPrompt.name,
            category_id: body.category_id,
            category_label: category.label,
            placement_type: category.placement_type,
        });

        const { data: newSystemPrompt, error: insertError } = await supabase
            .from("system_prompts_new")
            .insert({
                prompt_id: body.prompt_id,
                category_id: body.category_id,
                label: body.label || originalPrompt.name,
                description: body.description || originalPrompt.description || `System prompt created from: ${originalPrompt.name}`,
                icon_name: body.icon_name || 'Sparkles',
                source_prompt_id: id,
                version: 1,
                prompt_snapshot: promptSnapshot,
                tags: body.tags || [],
                sort_order: body.sort_order || 0,
                is_active: false,  // Start as inactive - admin must enable
                is_featured: false,
                status: 'draft',   // Start as draft
                metadata: {
                    ...(body.metadata || {}),
                    created_from_prompt_id: id,
                    created_from_prompt_name: originalPrompt.name,
                    category_label: category.label,
                    placement_type: category.placement_type
                },
                published_by: user.id,
                published_at: new Date().toISOString(),
            })
            .select(`
                *,
                category:system_prompt_categories_new!category_id (
                    id,
                    category_id,
                    placement_type,
                    label,
                    icon_name,
                    color
                )
            `)
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { 
                    error: "Failed to create system prompt",
                    details: insertError.message || "Database error",
                    code: insertError.code,
                    hint: insertError.hint
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
    } catch (error: any) {
        console.error('Convert to system prompt error:', error);
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

