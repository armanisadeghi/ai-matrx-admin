import * as Icons from 'lucide-react';
import { 
    ContentBlockDB, 
    CategoryConfigDB, 
    SubcategoryConfigDB,
    CategoryWithSubcategories,
    ContentBlockQueryOptions 
} from '@/types/content-blocks-db';
import { ContentBlock, CategoryConfig, SubcategoryConfig } from '@/features/rich-text-editor/config/contentBlocks';
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import { getScriptSupabaseClient } from '@/utils/supabase/getScriptClient';

// Helper to get the right client based on context
function getClient() {
    if (typeof window !== 'undefined') {
        // Browser context - use browser client
        return getBrowserSupabaseClient();
    } else {
        // Script/server context - use script client
        return getScriptSupabaseClient();
    }
}

// Helper function to get Lucide icon component from name
export function getIconComponent(iconName: string): any {
    // Default to FileText if icon not found
    return (Icons as any)[iconName] || Icons.FileText;
}

// Convert database record to frontend ContentBlock format
export function dbContentBlockToContentBlock(dbBlock: ContentBlockDB): ContentBlock {
    return {
        id: dbBlock.block_id,
        label: dbBlock.label,
        description: dbBlock.description || '',
        icon: getIconComponent(dbBlock.icon_name),
        category: dbBlock.category,
        subcategory: dbBlock.subcategory || undefined,
        template: dbBlock.template
    };
}

// Convert database record to frontend CategoryConfig format
export function dbCategoryConfigToCategoryConfig(
    dbCategory: CategoryConfigDB, 
    subcategories: SubcategoryConfigDB[] = []
): CategoryConfig {
    return {
        id: dbCategory.category_id,
        label: dbCategory.label,
        icon: getIconComponent(dbCategory.icon_name),
        color: dbCategory.color,
        subcategories: subcategories.map(sub => ({
            id: sub.subcategory_id,
            label: sub.label,
            icon: getIconComponent(sub.icon_name)
        }))
    };
}

// Fetch all content blocks from database
export async function fetchContentBlocks(options: ContentBlockQueryOptions = {}) {
    const supabase = getClient();
    let query = supabase
        .from('content_blocks')
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
        query = query.or(`label.ilike.%${options.search}%,description.ilike.%${options.search}%,block_id.ilike.%${options.search}%`);
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
    
    return data as ContentBlockDB[];
}

// Fetch content blocks by category
export async function fetchContentBlocksByCategory(category: string) {
    return fetchContentBlocks({ category, is_active: true });
}

// Fetch content blocks by subcategory
export async function fetchContentBlocksBySubcategory(category: string, subcategory: string) {
    return fetchContentBlocks({ category, subcategory, is_active: true });
}

// Fetch content blocks without subcategory
export async function fetchContentBlocksWithoutSubcategory(category: string) {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('category', category)
        .is('subcategory', null)
        .eq('is_active', true)
        .order('sort_order');

    if (error) throw error;
    return data as ContentBlockDB[];
}

// Fetch category configurations
export async function fetchCategoryConfigs() {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('category_configs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

    if (error) throw error;
    return data as CategoryConfigDB[];
}

// Fetch subcategory configurations
export async function fetchSubcategoryConfigs(categoryId?: string) {
    const supabase = getClient();
    let query = supabase
        .from('subcategory_configs')
        .select('*')
        .eq('is_active', true);

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    query = query.order('sort_order');

    const { data, error } = await query;
    if (error) throw error;
    return data as SubcategoryConfigDB[];
}

// Fetch complete hierarchical structure
export async function fetchCompleteContentBlockStructure(): Promise<{
    categories: CategoryConfig[];
    contentBlocks: ContentBlock[];
}> {
    try {
        // Fetch all data in parallel
        const [categories, subcategories, blocks] = await Promise.all([
            fetchCategoryConfigs(),
            fetchSubcategoryConfigs(),
            fetchContentBlocks({ is_active: true })
        ]);

        // Convert to frontend format
        const categoryConfigs: CategoryConfig[] = categories.map(category => {
            const categorySubcategories = subcategories.filter(sub => sub.category_id === category.category_id);
            return dbCategoryConfigToCategoryConfig(category, categorySubcategories);
        });

        const contentBlocks: ContentBlock[] = blocks.map(dbContentBlockToContentBlock);

        return {
            categories: categoryConfigs,
            contentBlocks
        };
    } catch (error) {
        console.error('Error fetching content block structure:', error);
        throw error;
    }
}

// Helper functions that match the original API
export async function getBlocksByCategory(category: string): Promise<ContentBlock[]> {
    const blocks = await fetchContentBlocksByCategory(category);
    return blocks.map(dbContentBlockToContentBlock);
}

export async function getBlocksBySubcategory(category: string, subcategory: string): Promise<ContentBlock[]> {
    const blocks = await fetchContentBlocksBySubcategory(category, subcategory);
    return blocks.map(dbContentBlockToContentBlock);
}

export async function getBlocksWithoutSubcategory(category: string): Promise<ContentBlock[]> {
    const blocks = await fetchContentBlocksWithoutSubcategory(category);
    return blocks.map(dbContentBlockToContentBlock);
}

export async function getBlockById(id: string): Promise<ContentBlock | null> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('block_id', id)
        .eq('is_active', true)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }

    return dbContentBlockToContentBlock(data);
}

// Cache management
let cachedStructure: { categories: CategoryConfig[], contentBlocks: ContentBlock[] } | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedContentBlockStructure(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && cachedStructure && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedStructure;
    }

    cachedStructure = await fetchCompleteContentBlockStructure();
    cacheTimestamp = now;
    
    return cachedStructure;
}

export function clearContentBlockCache() {
    cachedStructure = null;
    cacheTimestamp = 0;
}
