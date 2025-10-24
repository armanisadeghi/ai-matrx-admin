// features/transcripts/components/TranscriptsLayout.tsx
'use client';

import React, { useState } from 'react';
import { TranscriptsSidebar } from './TranscriptsSidebar';
import { TranscriptViewer } from './TranscriptViewer';
import { TranscriptToolbar } from './TranscriptToolbar';
import { useTranscriptsContext } from '../context/TranscriptsContext';
import { Loader2, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TranscriptsLayoutProps {
    className?: string;
}

export function TranscriptsLayout({ className }: TranscriptsLayoutProps) {
    const { isLoading } = useTranscriptsContext();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className={cn("flex h-full overflow-hidden bg-textured", className)}>
            {/* Desktop Sidebar */}
            <div className="w-80 shrink-0 hidden md:block">
                <TranscriptsSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile: Show menu button */}
                <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-gray-800 md:hidden">
                    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 m-1.5">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[320px]">
                            <TranscriptsSidebar />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Toolbar */}
                <TranscriptToolbar className="hidden md:flex" />
                
                {/* Transcript Viewer */}
                <TranscriptViewer />
            </div>
        </div>
    );
}

