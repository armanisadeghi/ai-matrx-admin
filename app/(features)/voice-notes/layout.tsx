import { ReactNode } from 'react';

export default function VoiceNotesLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
            {children}
        </div>
    );
}