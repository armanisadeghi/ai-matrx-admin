// app/(authenticated)/tests/notes-app/page.tsx
'use client';

import React from 'react';
import {EditorLayout} from "@/components/notes-app/layout/EditorLayout";

export default function NotesPage() {
    return (
        <div className="h-screen w-full overflow-hidden">
            <EditorLayout/>
        </div>
    );
}
