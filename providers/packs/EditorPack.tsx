'use client';

// EditorPack — Provider pack for routes with rich text editing.
// Wraps children with EditorProvider, ChipMenuProvider, and RefProvider.

import { EditorProvider } from '@/providers/rich-text-editor/Provider';
import { ChipMenuProvider } from '@/features/rich-text-editor/components/ChipContextMenu';
import { RefProvider } from '@/lib/refs';

interface EditorPackProps {
    children: React.ReactNode;
}

export function EditorPack({ children }: EditorPackProps) {
    return (
        <EditorProvider>
            <ChipMenuProvider>
                <RefProvider>
                    {children}
                </RefProvider>
            </ChipMenuProvider>
        </EditorProvider>
    );
}
