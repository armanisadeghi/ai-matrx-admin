// app/(authenticated)/image-editing/page.tsx
"use client";

import AdvancedImageEditorIndex from '@/components/advanced-image-editor';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';

const title = "Advanced Image Editor";

export default function HomePage() {
    return (
        <main className="p-2 min-h-screen flex-col items-center justify-start">
            <div className="w-full text-center mb-4">
                <TextGenerateEffect words={title} />
            </div>
            <AdvancedImageEditorIndex />
        </main>
    );
}
