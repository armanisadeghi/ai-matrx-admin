// components/notes-app/layout/MobileLayout.tsx
'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MobileLayout = ({ children }: { children: React.ReactNode }) => {
    const [showNotesList, setShowNotesList] = useState(false);

    return (
        <div className="notes-mobile-layout relative h-full">
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-2 left-2 z-20 md:hidden"
                onClick={() => setShowNotesList(!showNotesList)}
            >
                <Menu className="h-4 w-4" />
            </Button>
            {children}
        </div>
    );
};
