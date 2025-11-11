import {
    SystemPromptDB,
    CreateSystemPromptInput,
    UpdateSystemPromptInput,
    PublishPromptAsSystemInput,
    PromptDiff,
    TriggerType,
    CategoryWithSubcategories
} from '@/types/system-prompts-db';
import { PromptsData } from '@/features/prompts/types/core';
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import { getScriptSupabaseClient } from '@/utils/supabase/getScriptClient';

// Helper to get the right client based on context
function getClient() {
    if (typeof window !== 'undefined') {
        return getBrowserSupabaseClient();
    } else {
        return getScriptSupabaseClient();
    }
}

export interface SystemPromptQueryOptions {
    category?: string;
    subcategory?: string;
    is_active?: boolean;
    search?: string;
    triggers?: TriggerType[];
    order_by?: string;
    order_direction?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// Fetch all system prompts from database
export async function fetchSystemPrompts(options: SystemPromptQueryOptions = {}) {
    const supabase = getClient();
    let query = supabase
        .from('system_prompts')
        .select('*');

    // Apply filters
    if (options.category) {
        query = query.eq('category', options.category);
    }

    if (options.subcategory) {
        query = query.eq('subcategory', options.subcategory);
    }

    if (options.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
    }

    if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,system_prompt_id.ilike.%${options.search}%`);
    }

    // Filter by triggers if provided
    if (options.triggers && options.triggers.length > 0) {
        query = query.contains('enabled_triggers', options.triggers);
    }

    // Apply ordering
    const orderBy = options.order_by || 'sort_order';
    const orderDirection = options.order_direction || 'asc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply pagination
    if (options.limit) {
        query = query.limit(options.limit);
    }

    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data as SystemPromptDB[];
}

// Get a single system prompt by ID
export async function getSystemPromptById(id: string): Promise<SystemPromptDB | null> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }

    return data as SystemPromptDB;
}

// Get a system prompt by system_prompt_id
export async function getSystemPromptBySystemId(systemPromptId: string): Promise<SystemPromptDB | null> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('system_prompt_id', systemPromptId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }

    return data as SystemPromptDB;
}

// Fetch system prompts by category
export async function getSystemPromptsByCategory(category: string): Promise<SystemPromptDB[]> {
    return fetchSystemPrompts({ category, is_active: true });
}

// Fetch system prompts by trigger type
export async function getSystemPromptsByTrigger(trigger: TriggerType): Promise<SystemPromptDB[]> {
    return fetchSystemPrompts({ triggers: [trigger], is_active: true });
}

// Create a new system prompt
export async function createSystemPrompt(input: CreateSystemPromptInput): Promise<SystemPromptDB> {
    const supabase = getClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('system_prompts')
        .insert([{
            name: input.name,
            description: input.description || null,
            messages: input.messages,
            variable_defaults: input.variable_defaults || null,
            settings: input.settings || null,
            system_prompt_id: input.system_prompt_id,
            source_prompt_id: input.source_prompt_id || null,
            icon_name: input.icon_name || 'Sparkles',
            category: input.category,
            subcategory: input.subcategory || null,
            sort_order: input.sort_order || 0,
            enabled_triggers: input.enabled_triggers || ['context-menu'],
            trigger_config: input.trigger_config || {},
            variable_schema: input.variable_schema || null,
            is_active: input.is_active !== undefined ? input.is_active : true,
            created_by: user.id
        }])
        .select()
        .single();

    if (error) throw error;

    // Clear cache
    clearSystemPromptsCache();

    return data as SystemPromptDB;
}

// Update an existing system prompt
export async function updateSystemPrompt(input: UpdateSystemPromptInput): Promise<SystemPromptDB> {
    const supabase = getClient();

    const updateData: any = {
        updated_at: new Date().toISOString()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.messages !== undefined) updateData.messages = input.messages;
    if (input.variable_defaults !== undefined) updateData.variable_defaults = input.variable_defaults;
    if (input.settings !== undefined) updateData.settings = input.settings;
    if (input.system_prompt_id !== undefined) updateData.system_prompt_id = input.system_prompt_id;
    if (input.icon_name !== undefined) updateData.icon_name = input.icon_name;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.subcategory !== undefined) updateData.subcategory = input.subcategory;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
    if (input.enabled_triggers !== undefined) updateData.enabled_triggers = input.enabled_triggers;
    if (input.trigger_config !== undefined) updateData.trigger_config = input.trigger_config;
    if (input.variable_schema !== undefined) updateData.variable_schema = input.variable_schema;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
        .from('system_prompts')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

    if (error) throw error;

    // Clear cache
    clearSystemPromptsCache();

    return data as SystemPromptDB;
}

// Delete a system prompt
export async function deleteSystemPrompt(id: string): Promise<void> {
    const supabase = getClient();

    const { error } = await supabase
        .from('system_prompts')
        .delete()
        .eq('id', id);

    if (error) throw error;

    // Clear cache
    clearSystemPromptsCache();
}

// Publish a user prompt as a system prompt (creates a duplicate)
export async function publishPromptAsSystem(input: PublishPromptAsSystemInput): Promise<SystemPromptDB> {
    const supabase = getClient();

    // Fetch the source prompt
    const { data: sourcePrompt, error: fetchError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', input.source_prompt_id)
        .single();

    if (fetchError || !sourcePrompt) {
        throw new Error('Source prompt not found');
    }

    // Create system prompt with duplicated data
    const createInput: CreateSystemPromptInput = {
        name: sourcePrompt.name,
        description: sourcePrompt.description,
        messages: sourcePrompt.messages,
        variable_defaults: sourcePrompt.variableDefaults || sourcePrompt.variable_defaults,
        settings: sourcePrompt.settings,
        system_prompt_id: input.system_prompt_id,
        source_prompt_id: input.source_prompt_id,
        icon_name: input.icon_name || 'Sparkles',
        category: input.category,
        subcategory: input.subcategory,
        enabled_triggers: input.enabled_triggers,
        trigger_config: input.trigger_config || {},
        variable_schema: input.variable_schema,
        is_active: true
    };

    return createSystemPrompt(createInput);
}

// Compare two prompts for differences
export function comparePrompts(
    oldPrompt: SystemPromptDB | null,
    newPromptData: Partial<PromptsData>
): PromptDiff {
    if (!oldPrompt) {
        return {
            hasChanges: true,
            nameChanged: true,
            descriptionChanged: true,
            messagesChanged: true,
            variablesChanged: true,
            settingsChanged: true,
            oldPrompt: null,
            newPrompt: newPromptData as any
        };
    }

    const nameChanged = newPromptData.name !== undefined && newPromptData.name !== oldPrompt.name;
    const descriptionChanged = newPromptData.description !== undefined && newPromptData.description !== oldPrompt.description;

    // Deep compare messages
    const messagesChanged = newPromptData.messages !== undefined &&
        JSON.stringify(newPromptData.messages) !== JSON.stringify(oldPrompt.messages);

    // Deep compare variables
    const variablesChanged = newPromptData.variableDefaults !== undefined &&
        JSON.stringify(newPromptData.variableDefaults) !== JSON.stringify(oldPrompt.variable_defaults);

    // Deep compare settings
    const settingsChanged = newPromptData.settings !== undefined &&
        JSON.stringify(newPromptData.settings) !== JSON.stringify(oldPrompt.settings);

    return {
        hasChanges: nameChanged || descriptionChanged || messagesChanged || variablesChanged || settingsChanged,
        nameChanged,
        descriptionChanged,
        messagesChanged,
        variablesChanged,
        settingsChanged,
        oldPrompt,
        newPrompt: newPromptData as any
    };
}

// Check if source prompt has updates
export async function checkSourceForUpdates(systemPromptId: string): Promise<PromptDiff> {
    const supabase = getClient();

    // Get the system prompt
    const systemPrompt = await getSystemPromptBySystemId(systemPromptId);
    if (!systemPrompt || !systemPrompt.source_prompt_id) {
        throw new Error('System prompt or source not found');
    }

    // Fetch the current source prompt
    const { data: sourcePrompt, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', systemPrompt.source_prompt_id)
        .single();

    if (error || !sourcePrompt) {
        throw new Error('Source prompt not found');
    }

    return comparePrompts(systemPrompt, sourcePrompt);
}

// Update system prompt from source
export async function updateFromSource(systemPromptId: string): Promise<SystemPromptDB> {
    const supabase = getClient();

    // Get the system prompt
    const systemPrompt = await getSystemPromptBySystemId(systemPromptId);
    if (!systemPrompt || !systemPrompt.source_prompt_id) {
        throw new Error('System prompt or source not found');
    }

    // Fetch the current source prompt
    const { data: sourcePrompt, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', systemPrompt.source_prompt_id)
        .single();

    if (error || !sourcePrompt) {
        throw new Error('Source prompt not found');
    }

    // Update system prompt with source data
    const updateInput: UpdateSystemPromptInput = {
        id: systemPrompt.id,
        name: sourcePrompt.name,
        description: sourcePrompt.description,
        messages: sourcePrompt.messages,
        variable_defaults: sourcePrompt.variableDefaults || sourcePrompt.variable_defaults,
        settings: sourcePrompt.settings,
        source_updated_at: new Date().toISOString()
    };

    return updateSystemPrompt(updateInput);
}

// Fetch categories with subcategories (reuse from content blocks or create new)
export async function fetchSystemPromptCategories(): Promise<CategoryWithSubcategories[]> {
    const supabase = getClient();

    // Load categories
    const { data: categoryData, error: categoryError } = await supabase
        .from('category_configs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

    if (categoryError) throw categoryError;

    // Load subcategories
    const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategory_configs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

    if (subcategoryError) throw subcategoryError;

    // Group subcategories by category
    const subcategoriesByCategory = new Map<string, any[]>();
    subcategoryData?.forEach(sub => {
        const existing = subcategoriesByCategory.get(sub.category_id) || [];
        existing.push(sub);
        subcategoriesByCategory.set(sub.category_id, existing);
    });

    // Combine into CategoryWithSubcategories structure
    const categories: CategoryWithSubcategories[] = (categoryData || []).map(cat => ({
        id: cat.id,
        category_id: cat.category_id,
        label: cat.label,
        icon_name: cat.icon_name,
        color: cat.color,
        sort_order: cat.sort_order,
        is_active: cat.is_active,
        subcategories: subcategoriesByCategory.get(cat.category_id) || []
    }));

    return categories;
}

// Cache management
let cachedSystemPrompts: SystemPromptDB[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedSystemPrompts(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && cachedSystemPrompts && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedSystemPrompts;
    }

    cachedSystemPrompts = await fetchSystemPrompts({ is_active: true });
    cacheTimestamp = now;

    return cachedSystemPrompts;
}

export function clearSystemPromptsCache() {
    cachedSystemPrompts = null;
    cacheTimestamp = 0;
}

// Helper to generate system_prompt_id from name (slugify)
export function generateSystemPromptId(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
