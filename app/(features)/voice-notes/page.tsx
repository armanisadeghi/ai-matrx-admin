'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the voice notes content to avoid SSR issues with MediaRecorder
const VoiceNotesContent = dynamic(
    () => import('./components/VoiceNotesContent'),
    { 
        ssr: false,
        loading: () => (
            <div className="h-full flex items-center justify-center bg-textured">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading Voice Notes...</p>
                </div>
            </div>
        )
    }
);

export default function VoiceNotesPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-full flex items-center justify-center bg-textured">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Initializing...</p>
                </div>
            </div>
        );
    }

    return <VoiceNotesContent />;
}
