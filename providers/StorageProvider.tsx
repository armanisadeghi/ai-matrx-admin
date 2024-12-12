// components/providers/StorageProvider.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { RootState } from '@/lib/redux/store';

interface StorageProviderProps {
    children: React.ReactNode;
}

export function StorageProvider({ children }: StorageProviderProps) {
    const [isHydrated, setIsHydrated] = useState(false);
    const notes = useSelector((state: RootState) => state.notes.notes);
    const tags = useSelector((state: RootState) => state.tags.tags);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    if (!isHydrated) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
}
