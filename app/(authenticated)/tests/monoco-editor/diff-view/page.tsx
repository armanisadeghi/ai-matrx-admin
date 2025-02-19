// app/(authenticated)/tests/monoco-editor/page.tsx
'use client';

import ProCodeEditor from '@/components/code-editor/ProCodeEditor';

export default function Page() {
    return (
        <div className="w-full h-full">
            <ProCodeEditor/>
        </div>
    );
}