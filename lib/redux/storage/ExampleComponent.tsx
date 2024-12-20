'use client';

import React from 'react';
import { useStorage } from './useStorage';

export const StorageExplorer: React.FC = () => {
    const {
        currentBucket,
        currentPath,
        items,
        buckets,
        isLoading,
        error,
        initialize,
        selectBucket,
        navigateFolder,
        uploadFile,
    } = useStorage();

    React.useEffect(() => {
        initialize({
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY!,
        });
    }, []);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            {/* Your UI implementation */}
        </div>
    );
};
