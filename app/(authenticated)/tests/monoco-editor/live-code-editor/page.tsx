// app/(authenticated)/tests/monoco-editor/live-code-editor/page.tsx
'use client';

import LiveCodeEditor from '../components/LiveCodeEditor';

export default function Page() {
    return (
        <div className="w-full h-full">
            <LiveCodeEditor />
        </div>
    );
}