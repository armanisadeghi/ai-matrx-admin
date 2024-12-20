import type { Bucket, StorageItem } from '@/utils/supabase/StorageManager';

export interface StorageState {
    currentBucket: string;
    currentPath: string[];
    items: StorageItem[];
    buckets: Bucket[];
    isLoading: boolean;
    error: string | null;
}
