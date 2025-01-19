"use client"

import { IconTerminal } from '@tabler/icons-react';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-full flex flex-col relative">
            {/* Header */}
            <div className="h-12 bg-neutral-900 border-b border-neutral-700 flex items-center px-4">
                <h1 className="text-sm font-medium">Workspace Editor</h1>
            </div>

            <div className="flex-1 flex">
                {/* Main Content Area */}
                {children}

                {/* Terminal (moved to layout since it's a consistent UI element) */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-neutral-900 border-t border-neutral-700">
                    <div className="flex items-center gap-2 p-2 border-b border-neutral-700">
                        <IconTerminal size={16} />
                        <span className="text-sm">Terminal</span>
                    </div>
                    <div className="p-2 text-sm font-mono">
                        <span className="text-green-400">$</span> npm start
                    </div>
                </div>
            </div>
        </div>
    );
}