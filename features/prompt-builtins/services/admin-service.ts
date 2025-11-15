import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import { getScriptSupabaseClient } from '@/utils/supabase/getScriptClient';
import {
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
  CreateShortcutCategoryInput,
  UpdateShortcutCategoryInput,
  CreatePromptBuiltinInput,
  UpdatePromptBuiltinInput,
  CreatePromptShortcutInput,
  UpdatePromptShortcutInput,
  ContextMenuRow,
  PromptExecutionData,
} from '../types';
import { logDetailedError } from '../utils/error-handler';

// Helper to get the right client based on context
function getClient() {
  if (typeof window !== 'undefined') {
    return getBrowserSupabaseClient();
  } else {
    return getScriptSupabaseClient();
  }
}

// ============================================================================
// Shortcut Categories
// ============================================================================

export async function fetchShortcutCategories(filters?: {
  placement_type?: string;
  parent_category_id?: string | null;
  is_active?: boolean;
}): Promise<ShortcutCategory[]> {
  const supabase = getClient();
  let query = supabase
    .from('shortcut_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (filters?.placement_type) {
    query = query.eq('placement_type', filters.placement_type);
  }
  if (filters?.parent_category_id !== undefined) {
    if (filters.parent_category_id === null) {
      query = query.is('parent_category_id', null);
    } else {
      query = query.eq('parent_category_id', filters.parent_category_id);
    }
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  const { data, error } = await query;

  if (error) {
    logDetailedError('fetchShortcutCategories', error);
    throw new Error(`Failed to fetch shortcut categories: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  return data as ShortcutCategory[];
}

export async function getShortcutCategoryById(id: string): Promise<ShortcutCategory | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('shortcut_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as ShortcutCategory;
}

export async function createShortcutCategory(input: CreateShortcutCategoryInput): Promise<ShortcutCategory> {
  const supabase = getClient();
  
  const insertData: any = {
    placement_type: input.placement_type,
    label: input.label,
    parent_category_id: input.parent_category_id ?? null,
    description: input.description ?? null,
    icon_name: input.icon_name ?? 'SquareMenu',
    color: input.color ?? 'zinc',
    sort_order: input.sort_order ?? 999,
    is_active: input.is_active ?? true,
    metadata: input.metadata ?? {},
  };

  // Only add ID if provided
  if (input.id) {
    insertData.id = input.id;
  }

  const { data, error } = await supabase
    .from('shortcut_categories')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    logDetailedError('createShortcutCategory', error);
    throw new Error(`Failed to create shortcut category: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  if (!data) {
    throw new Error('No data returned after creating shortcut category');
  }

  return data as ShortcutCategory;
}

export async function updateShortcutCategory(input: UpdateShortcutCategoryInput): Promise<ShortcutCategory> {
  const supabase = getClient();
  const updateData: any = {};

  if (input.placement_type !== undefined) updateData.placement_type = input.placement_type;
  if (input.parent_category_id !== undefined) updateData.parent_category_id = input.parent_category_id;
  if (input.label !== undefined) updateData.label = input.label;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon_name !== undefined) updateData.icon_name = input.icon_name;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  const { data, error } = await supabase
    .from('shortcut_categories')
    .update(updateData)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    logDetailedError('updateShortcutCategory', error);
    throw new Error(`Failed to update shortcut category: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  if (!data) {
    throw new Error('No data returned after updating shortcut category');
  }

  return data as ShortcutCategory;
}

export async function deleteShortcutCategory(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('shortcut_categories')
    .delete()
    .eq('id', id);

  if (error) {
    logDetailedError('deleteShortcutCategory', error);
    throw new Error(`Failed to delete shortcut category: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }
}

/**
 * Soft delete - sets is_active to false
 */
export async function deactivateShortcutCategory(id: string): Promise<ShortcutCategory> {
  return updateShortcutCategory({ id, is_active: false });
}

/**
 * Reactivate - sets is_active to true
 */
export async function activateShortcutCategory(id: string): Promise<ShortcutCategory> {
  return updateShortcutCategory({ id, is_active: true });
}

// ============================================================================
// Prompt Builtins
// ============================================================================

/**
 * Transform database prompt builtin (snake_case) to UI format (camelCase)
 */
function transformBuiltinFromDB(dbBuiltin: any): PromptBuiltin {
  return {
    ...dbBuiltin,
    variableDefaults: dbBuiltin.variable_defaults || [],
  };
}

export async function fetchPromptBuiltins(filters?: {
  is_active?: boolean;
  search?: string;
  limit?: number;
}): Promise<PromptBuiltin[]> {
  const supabase = getClient();
  let query = supabase
    .from('prompt_builtins')
    .select('*')
    .order('name', { ascending: true });

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    logDetailedError('fetchPromptBuiltins', error);
    throw new Error(`Failed to fetch prompt builtins: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  // Transform from DB format to UI format
  return (data || []).map(transformBuiltinFromDB);
}

export async function getPromptBuiltinById(id: string): Promise<PromptBuiltin | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('prompt_builtins')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data ? transformBuiltinFromDB(data) : null;
}

export async function createPromptBuiltin(input: CreatePromptBuiltinInput): Promise<PromptBuiltin> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const insertData: any = {
    name: input.name,
    description: input.description ?? null,
    messages: input.messages,
    variable_defaults: input.variableDefaults ?? null, // DB uses snake_case
    tools: input.tools ?? null,
    settings: input.settings ?? {},
    is_active: input.is_active ?? true,
    created_by_user_id: user.id,
  };

  // Only add ID if provided
  if (input.id) {
    insertData.id = input.id;
  }

  const { data, error } = await supabase
    .from('prompt_builtins')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    logDetailedError('createPromptBuiltin', error);
    throw new Error(`Failed to create prompt builtin: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  return data as PromptBuiltin;
}

export async function updatePromptBuiltin(input: UpdatePromptBuiltinInput): Promise<PromptBuiltin> {
  const supabase = getClient();
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.messages !== undefined) updateData.messages = input.messages;
  if (input.variableDefaults !== undefined) updateData.variable_defaults = input.variableDefaults; // DB uses snake_case
  if (input.tools !== undefined) updateData.tools = input.tools;
  if (input.settings !== undefined) updateData.settings = input.settings;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabase
    .from('prompt_builtins')
    .update(updateData)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    logDetailedError('updatePromptBuiltin', error);
    throw new Error(`Failed to update prompt builtin: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  return data as PromptBuiltin;
}

export async function deletePromptBuiltin(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('prompt_builtins')
    .delete()
    .eq('id', id);

  if (error) {
    logDetailedError('deletePromptBuiltin', error);
    throw new Error(`Failed to delete prompt builtin: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }
}

/**
 * Soft delete - sets is_active to false
 */
export async function deactivatePromptBuiltin(id: string): Promise<PromptBuiltin> {
  return updatePromptBuiltin({ id, is_active: false });
}

/**
 * Reactivate - sets is_active to true
 */
export async function activatePromptBuiltin(id: string): Promise<PromptBuiltin> {
  return updatePromptBuiltin({ id, is_active: true });
}

// ============================================================================
// Prompt Shortcuts
// ============================================================================

export async function fetchPromptShortcuts(filters?: {
  category_id?: string;
  prompt_builtin_id?: string;
  is_active?: boolean;
  limit?: number;
}): Promise<PromptShortcut[]> {
  const supabase = getClient();
  let query = supabase
    .from('prompt_shortcuts')
    .select('*')
    .order('sort_order', { ascending: true });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.prompt_builtin_id) {
    query = query.eq('prompt_builtin_id', filters.prompt_builtin_id);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    logDetailedError('fetchPromptShortcuts', error);
    throw new Error(`Failed to fetch prompt shortcuts: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  return data as PromptShortcut[];
}

export async function getPromptShortcutById(id: string): Promise<PromptShortcut | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('prompt_shortcuts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as PromptShortcut;
}

export async function createPromptShortcut(input: CreatePromptShortcutInput): Promise<PromptShortcut> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();

  const insertData: any = {
    prompt_builtin_id: input.prompt_builtin_id ?? null,
    category_id: input.category_id,
    label: input.label,
    description: input.description ?? null,
    icon_name: input.icon_name ?? null,
    keyboard_shortcut: input.keyboard_shortcut ?? null,
    sort_order: input.sort_order ?? 0,
    scope_mappings: input.scope_mappings ?? null,
    available_scopes: input.available_scopes ?? null,
    // Execution Configuration
    result_display: input.result_display ?? 'modal',
    auto_run: input.auto_run ?? true,
    allow_chat: input.allow_chat ?? true,
    show_variables: input.show_variables ?? false,
    apply_variables: input.apply_variables ?? true,
    is_active: input.is_active ?? true,
    created_by_user_id: user?.id ?? null,
  };

  // Only add ID if provided
  if (input.id) {
    insertData.id = input.id;
  }

  const { data, error } = await supabase
    .from('prompt_shortcuts')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    logDetailedError('createPromptShortcut', error);
    throw new Error(`Failed to create prompt shortcut: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  if (!data) {
    throw new Error('No data returned after creating prompt shortcut');
  }

  return data as PromptShortcut;
}

export async function updatePromptShortcut(input: UpdatePromptShortcutInput): Promise<PromptShortcut> {
  const supabase = getClient();
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.prompt_builtin_id !== undefined) updateData.prompt_builtin_id = input.prompt_builtin_id;
  if (input.category_id !== undefined) updateData.category_id = input.category_id;
  if (input.label !== undefined) updateData.label = input.label;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon_name !== undefined) updateData.icon_name = input.icon_name;
  if (input.keyboard_shortcut !== undefined) updateData.keyboard_shortcut = input.keyboard_shortcut;
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
  if (input.scope_mappings !== undefined) updateData.scope_mappings = input.scope_mappings;
  if (input.available_scopes !== undefined) updateData.available_scopes = input.available_scopes;
  // Execution Configuration
  if (input.result_display !== undefined) updateData.result_display = input.result_display;
  if (input.auto_run !== undefined) updateData.auto_run = input.auto_run;
  if (input.allow_chat !== undefined) updateData.allow_chat = input.allow_chat;
  if (input.show_variables !== undefined) updateData.show_variables = input.show_variables;
  if (input.apply_variables !== undefined) updateData.apply_variables = input.apply_variables;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabase
    .from('prompt_shortcuts')
    .update(updateData)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    logDetailedError('updatePromptShortcut', error);
    throw new Error(`Failed to update prompt shortcut: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  return data as PromptShortcut;
}

export async function deletePromptShortcut(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('prompt_shortcuts')
    .delete()
    .eq('id', id);

  if (error) {
    logDetailedError('deletePromptShortcut', error);
    throw new Error(`Failed to delete prompt shortcut: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }
}

/**
 * Soft delete - sets is_active to false
 */
export async function deactivatePromptShortcut(id: string): Promise<PromptShortcut> {
  return updatePromptShortcut({ id, is_active: false });
}

/**
 * Reactivate - sets is_active to true
 */
export async function activatePromptShortcut(id: string): Promise<PromptShortcut> {
  return updatePromptShortcut({ id, is_active: true });
}

// ============================================================================
// Context Menu Operations
// ============================================================================

/**
 * Fetch the context menu view for a specific placement type
 * Used to build the UI for context menus
 */
export async function fetchContextMenuView(placementType: string = 'menu'): Promise<ContextMenuRow[]> {
  const supabase = getClient();
  
  const { data, error } = await supabase
    .from('context_menu_view')
    .select('*')
    .eq('placement_type', placementType);

  if (error) {
    logDetailedError('fetchContextMenuView', error);
    throw new Error(`Failed to fetch context menu view: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  return data as ContextMenuRow[];
}

/**
 * Get execution data for a prompt shortcut
 * Used when a user clicks a menu item to execute the prompt
 */
export async function getPromptExecutionData(shortcutId: string): Promise<PromptExecutionData | null> {
  const supabase = getClient();
  
  const { data, error } = await supabase
    .rpc('get_prompt_execution_data', { p_shortcut_id: shortcutId });

  if (error) {
    logDetailedError('getPromptExecutionData', error);
    throw new Error(`Failed to get prompt execution data: ${error.message || 'Unknown error'} (Code: ${error.code || 'UNKNOWN'})`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as PromptExecutionData;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Fetch shortcuts with their related category and builtin data
 * Useful for admin UI that needs to display full relationship info
 */
export async function fetchShortcutsWithRelations(filters?: {
  category_id?: string;
  is_active?: boolean;
}): Promise<(PromptShortcut & {
  category: ShortcutCategory | null;
  builtin: PromptBuiltin | null;
})[]> {
  const shortcuts = await fetchPromptShortcuts(filters);

  if (shortcuts.length === 0) return [];

  const supabase = getClient();

  // Fetch related categories
  const categoryIds = [...new Set(shortcuts.map(s => s.category_id))];
  const { data: categories } = await supabase
    .from('shortcut_categories')
    .select('*')
    .in('id', categoryIds);

  // Fetch related builtins
  const builtinIds = [...new Set(shortcuts.map(s => s.prompt_builtin_id))].filter(Boolean);
  const { data: builtins } = await supabase
    .from('prompt_builtins')
    .select('*')
    .in('id', builtinIds);

  const categoryMap = new Map((categories || []).map(c => [c.id, c]));
  // Transform builtins from DB format to UI format
  const builtinMap = new Map((builtins || []).map(b => [b.id, transformBuiltinFromDB(b)]));

  return shortcuts.map(shortcut => ({
    ...shortcut,
    category: categoryMap.get(shortcut.category_id) || null,
    builtin: builtinMap.get(shortcut.prompt_builtin_id) || null,
  }));
}

/**
 * Get all categories with their shortcuts count
 * Useful for category management UI
 */
export async function fetchCategoriesWithShortcutCounts(placementType?: string): Promise<(ShortcutCategory & {
  shortcut_count: number;
})[]> {
  const categories = await fetchShortcutCategories(
    placementType ? { placement_type: placementType } : undefined
  );

  if (categories.length === 0) return categories.map(c => ({ ...c, shortcut_count: 0 }));

  const supabase = getClient();
  const categoryIds = categories.map(c => c.id);

  const { data: shortcuts } = await supabase
    .from('prompt_shortcuts')
    .select('category_id')
    .in('category_id', categoryIds)
    .eq('is_active', true);

  const countMap = new Map<string, number>();
  (shortcuts || []).forEach(s => {
    countMap.set(s.category_id, (countMap.get(s.category_id) || 0) + 1);
  });

  return categories.map(category => ({
    ...category,
    shortcut_count: countMap.get(category.id) || 0,
  }));
}

