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

// ============================================================================
// Types
// ============================================================================

export interface PromptAppCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    sort_order: number;
}

export interface CreateCategoryInput {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    sort_order?: number;
}

export interface UpdateCategoryInput {
    id: string;
    name?: string;
    description?: string;
    icon?: string;
    sort_order?: number;
}

export interface PromptAppError {
    id: string;
    app_id: string;
    execution_id?: string;
    error_type: string;
    error_code?: string;
    error_message?: string;
    error_details: Record<string, any>;
    variables_sent: Record<string, any>;
    expected_variables: Record<string, any>;
    resolved: boolean;
    resolved_at?: string;
    resolved_by?: string;
    resolution_notes?: string;
    created_at: string;
    // Joined data
    app_name?: string;
    app_slug?: string;
}

export interface ResolveErrorInput {
    id: string;
    resolution_notes?: string;
}

export interface PromptAppExecution {
    id: string;
    app_id: string;
    user_id?: string;
    fingerprint?: string;
    ip_address?: string;
    user_agent?: string;
    task_id: string;
    variables_provided: Record<string, any>;
    variables_used: Record<string, any>;
    success: boolean;
    error_type?: string;
    error_message?: string;
    execution_time_ms?: number;
    tokens_used?: number;
    cost?: number;
    referer?: string;
    metadata: Record<string, any>;
    created_at: string;
    // Joined data
    app_name?: string;
    app_slug?: string;
}

export interface PromptAppRateLimit {
    id: string;
    app_id: string;
    user_id?: string;
    fingerprint?: string;
    ip_address?: string;
    execution_count: number;
    first_execution_at: string;
    last_execution_at: string;
    window_start_at: string;
    is_blocked: boolean;
    blocked_until?: string;
    blocked_reason?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    app_name?: string;
    app_slug?: string;
}

export interface PromptAppAdminView {
    id: string;
    user_id: string;
    prompt_id: string;
    slug: string;
    name: string;
    tagline?: string;
    description?: string;
    category?: string;
    tags: string[];
    status: string;
    is_verified: boolean;
    is_featured: boolean;
    total_executions: number;
    unique_users_count: number;
    success_rate: number;
    avg_execution_time_ms?: number;
    total_tokens_used: number;
    total_cost: number;
    created_at: string;
    updated_at: string;
    published_at?: string;
    last_execution_at?: string;
    // Joined data
    creator_email?: string;
}

export interface UpdateAppAdminInput {
    id: string;
    status?: 'draft' | 'published' | 'archived' | 'suspended';
    is_verified?: boolean;
    is_featured?: boolean;
}

// ============================================================================
// Categories
// ============================================================================

export async function fetchCategories(): Promise<PromptAppCategory[]> {
    const supabase = getClient();
    console.log('Fetching categories...');
    const { data, error } = await supabase
        .from('prompt_app_categories')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
    console.log('Categories fetched:', data?.length || 0);
    return data as PromptAppCategory[];
}

export async function getCategoryById(id: string): Promise<PromptAppCategory | null> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('prompt_app_categories')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data as PromptAppCategory;
}

export async function createCategory(input: CreateCategoryInput): Promise<PromptAppCategory> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('prompt_app_categories')
        .insert([{
            id: input.id,
            name: input.name,
            description: input.description || null,
            icon: input.icon || null,
            sort_order: input.sort_order || 0
        }])
        .select()
        .single();

    if (error) throw error;
    return data as PromptAppCategory;
}

export async function updateCategory(input: UpdateCategoryInput): Promise<PromptAppCategory> {
    const supabase = getClient();
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

    const { data, error } = await supabase
        .from('prompt_app_categories')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

    if (error) throw error;
    return data as PromptAppCategory;
}

export async function deleteCategory(id: string): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase
        .from('prompt_app_categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================================================
// Errors
// ============================================================================

export async function fetchErrors(filters?: {
    app_id?: string;
    error_type?: string;
    resolved?: boolean;
    limit?: number;
}): Promise<PromptAppError[]> {
    const supabase = getClient();
    let query = supabase
        .from('prompt_app_errors')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.app_id) query = query.eq('app_id', filters.app_id);
    if (filters?.error_type) query = query.eq('error_type', filters.error_type);
    if (filters?.resolved !== undefined) query = query.eq('resolved', filters.resolved);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching errors:', error);
        throw error;
    }

    // Fetch app names separately if we have errors
    if (data && data.length > 0) {
        const appIds = [...new Set(data.map(e => e.app_id))];
        const { data: apps } = await supabase
            .from('prompt_apps')
            .select('id, name, slug')
            .in('id', appIds);

        const appMap = new Map(apps?.map(app => [app.id, app]) || []);

        return data.map(item => ({
            ...item,
            app_name: appMap.get(item.app_id)?.name,
            app_slug: appMap.get(item.app_id)?.slug
        })) as PromptAppError[];
    }

    return data as PromptAppError[];
}

export async function resolveError(input: ResolveErrorInput): Promise<PromptAppError> {
    const supabase = getClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('prompt_app_errors')
        .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            resolution_notes: input.resolution_notes || null
        })
        .eq('id', input.id)
        .select()
        .single();

    if (error) throw error;
    return data as PromptAppError;
}

export async function unresolveError(id: string): Promise<PromptAppError> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('prompt_app_errors')
        .update({
            resolved: false,
            resolved_at: null,
            resolved_by: null,
            resolution_notes: null
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as PromptAppError;
}

// ============================================================================
// Executions
// ============================================================================

export async function fetchExecutions(filters?: {
    app_id?: string;
    success?: boolean;
    limit?: number;
}): Promise<PromptAppExecution[]> {
    const supabase = getClient();
    let query = supabase
        .from('prompt_app_executions')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.app_id) query = query.eq('app_id', filters.app_id);
    if (filters?.success !== undefined) query = query.eq('success', filters.success);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching executions:', error);
        throw error;
    }

    // Fetch app names separately if we have executions
    if (data && data.length > 0) {
        const appIds = [...new Set(data.map(e => e.app_id))];
        const { data: apps } = await supabase
            .from('prompt_apps')
            .select('id, name, slug')
            .in('id', appIds);

        const appMap = new Map(apps?.map(app => [app.id, app]) || []);

        return data.map(item => ({
            ...item,
            app_name: appMap.get(item.app_id)?.name,
            app_slug: appMap.get(item.app_id)?.slug
        })) as PromptAppExecution[];
    }

    return data as PromptAppExecution[];
}

// ============================================================================
// Rate Limits
// ============================================================================

export async function fetchRateLimits(filters?: {
    app_id?: string;
    is_blocked?: boolean;
    limit?: number;
}): Promise<PromptAppRateLimit[]> {
    const supabase = getClient();
    let query = supabase
        .from('prompt_app_rate_limits')
        .select('*')
        .order('updated_at', { ascending: false });

    if (filters?.app_id) query = query.eq('app_id', filters.app_id);
    if (filters?.is_blocked !== undefined) query = query.eq('is_blocked', filters.is_blocked);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching rate limits:', error);
        throw error;
    }

    // Fetch app names separately if we have rate limits
    if (data && data.length > 0) {
        const appIds = [...new Set(data.map(e => e.app_id))];
        const { data: apps } = await supabase
            .from('prompt_apps')
            .select('id, name, slug')
            .in('id', appIds);

        const appMap = new Map(apps?.map(app => [app.id, app]) || []);

        return data.map(item => ({
            ...item,
            app_name: appMap.get(item.app_id)?.name,
            app_slug: appMap.get(item.app_id)?.slug
        })) as PromptAppRateLimit[];
    }

    return data as PromptAppRateLimit[];
}

export async function unblockRateLimit(id: string): Promise<PromptAppRateLimit> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('prompt_app_rate_limits')
        .update({
            is_blocked: false,
            blocked_until: null,
            blocked_reason: null,
            execution_count: 0,
            window_start_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as PromptAppRateLimit;
}

export async function blockRateLimit(id: string, reason?: string, blockedUntil?: Date): Promise<PromptAppRateLimit> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('prompt_app_rate_limits')
        .update({
            is_blocked: true,
            blocked_until: blockedUntil?.toISOString() || null,
            blocked_reason: reason || null
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as PromptAppRateLimit;
}

// ============================================================================
// Apps Admin
// ============================================================================

export async function fetchAppsAdmin(filters?: {
    status?: string;
    is_featured?: boolean;
    is_verified?: boolean;
    category?: string;
    limit?: number;
}): Promise<PromptAppAdminView[]> {
    const supabase = getClient();
    let query = supabase
        .from('prompt_apps')
        .select('*')
        .order('updated_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
    if (filters?.is_verified !== undefined) query = query.eq('is_verified', filters.is_verified);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching apps:', error);
        throw error;
    }

    // Fetch user emails separately if we have apps
    if (data && data.length > 0) {
        const userIds = [...new Set(data.map(app => app.user_id))];
        const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds);

        if (users && users.length > 0) {
            const userMap = new Map(users.map(user => [user.id, user]));

            return data.map(item => ({
                ...item,
                creator_email: userMap.get(item.user_id)?.email
            })) as PromptAppAdminView[];
        }
    }

    return data.map(item => ({ ...item, creator_email: undefined })) as PromptAppAdminView[];
}

export async function updateAppAdmin(input: UpdateAppAdminInput): Promise<PromptAppAdminView> {
    const supabase = getClient();
    const updateData: any = {
        updated_at: new Date().toISOString()
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.is_verified !== undefined) updateData.is_verified = input.is_verified;
    if (input.is_featured !== undefined) updateData.is_featured = input.is_featured;

    const { data, error } = await supabase
        .from('prompt_apps')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

    if (error) throw error;
    return data as PromptAppAdminView;
}

// ============================================================================
// Analytics
// ============================================================================

export async function fetchAnalytics(filters?: {
    app_id?: string;
    status?: string;
    limit?: number;
}): Promise<any[]> {
    const supabase = getClient();
    let query = supabase
        .from('prompt_app_analytics')
        .select('*')
        .order('total_executions', { ascending: false });

    if (filters?.app_id) query = query.eq('app_id', filters.app_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching analytics:', error);
        // Return empty array if view doesn't exist yet
        return [];
    }
    return data || [];
}

