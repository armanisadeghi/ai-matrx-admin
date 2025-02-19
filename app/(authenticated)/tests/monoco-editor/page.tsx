// app/(authenticated)/tests/monoco-editor/page.tsx
'use client';

import CodeEditor from '@/components/code-editor/CodeEditor';

export default function Page() {
    return (
        <div className="w-full h-full">
            <CodeEditor
                defaultLanguage="javascript"
                defaultValue="// Write your code here..."
                onChange={(value) => console.log('Code changed:', value)}
            />
        </div>
    );
}