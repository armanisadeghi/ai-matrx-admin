import { useState, useEffect } from 'react';
import { ContentBlock, CategoryConfig } from '@/features/rich-text-editor/config/contentBlocks';
import { getCachedContentBlockStructure, clearContentBlockCache } from '@/lib/services/content-blocks-service';

interface UseContentBlocksOptions {
    useDatabase?: boolean;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

interface UseContentBlocksReturn {
    contentBlocks: ContentBlock[];
    categoryConfigs: CategoryConfig[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    clearCache: () => void;
}

export function useContentBlocks(options: UseContentBlocksOptions = {}): UseContentBlocksReturn {
    const {
        useDatabase = false,
        autoRefresh = false,
        refreshInterval = 5 * 60 * 1000 // 5 minutes
    } = options;

    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
    const [categoryConfigs, setCategoryConfigs] = useState<CategoryConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadFromDatabase = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const structure = await getCachedContentBlockStructure();
            setContentBlocks(structure.contentBlocks);
            setCategoryConfigs(structure.categories);
        } catch (err) {
            console.error('Error loading content blocks from database:', err);
            setError(err as Error);
            
            // Fallback to static data on error
            const { contentBlocks: staticBlocks, categoryConfigs: staticCategories } = await import('@/features/rich-text-editor/config/contentBlocks');
            setContentBlocks(staticBlocks);
            setCategoryConfigs(staticCategories);
        } finally {
            setLoading(false);
        }
    };

    const loadFromStatic = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const { contentBlocks: staticBlocks, categoryConfigs: staticCategories } = await import('@/features/rich-text-editor/config/contentBlocks');
            setContentBlocks(staticBlocks);
            setCategoryConfigs(staticCategories);
        } catch (err) {
            console.error('Error loading static content blocks:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        if (useDatabase) {
            await loadFromDatabase();
        } else {
            await loadFromStatic();
        }
    };

    const clearCache = () => {
        clearContentBlockCache();
    };

    // Initial load
    useEffect(() => {
        refresh();
    }, [useDatabase]);

    // Auto-refresh setup
    useEffect(() => {
        if (!autoRefresh || !useDatabase) return;

        const interval = setInterval(refresh, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, useDatabase, refreshInterval]);

    return {
        contentBlocks,
        categoryConfigs,
        loading,
        error,
        refresh,
        clearCache
    };
}

// Convenience hooks for specific use cases
export function useStaticContentBlocks(): UseContentBlocksReturn {
    return useContentBlocks({ useDatabase: false });
}

export function useDatabaseContentBlocks(autoRefresh = false): UseContentBlocksReturn {
    return useContentBlocks({ 
        useDatabase: true, 
        autoRefresh,
        refreshInterval: 5 * 60 * 1000 // 5 minutes
    });
}
