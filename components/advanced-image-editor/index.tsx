// components/advanced-image-editor/index.tsx

"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { HoverEffect } from '../ui/card-hover-effect';
import Navbar from './Navigation';

const editorComponents = {
    BasicImageEditor: dynamic(() => import('./BasicImageEditor'), { ssr: false }),
    AdvancedImageEditor: dynamic(() => import('./AdvancedImageEditor'), { ssr: false }),
    ExtendedImageEditor: dynamic(() => import('./ExtendedImageEditor'), { ssr: false }),
    AIImageEditor: dynamic(() => import('./AIImageEditor'), { ssr: false }),
    ImageGeneration: dynamic(() => import('./ImageGeneration'), { ssr: false }),
    FullFeaturedImageEditor: dynamic(() => import('./FullFeaturedImageEditor'), { ssr: false }),
};

const editorOptions = [
    {
        title: "Basic Image Editor",
        menuTitle: "Basic",
        description: "A simple yet powerful tool for basic image editing.",
        component: "BasicImageEditor",
    },
    {
        title: "Advanced Image Editor",
        menuTitle: "Advanced",
        description: "A robust editor for more advanced image manipulation.",
        component: "AdvancedImageEditor",
    },
    {
        title: "Extended Image Editor",
        menuTitle: "Extended",
        description: "A feature-rich editor with extended capabilities for editing.",
        component: "ExtendedImageEditor",
    },
    {
        title: "AI Image Editor",
        menuTitle: "AI Editor",
        description: "AI-powered old-tools to enhance your image editing workflow.",
        component: "AIImageEditor",
    },
    {
        title: "Image Generation",
        menuTitle: "Generate",
        description: "Generate new images with the power of Matrx Image AI.",
        component: "ImageGeneration",
    },
    {
        title: "Full-Featured Image Editor",
        menuTitle: "Full-Featured",
        description: "The ultimate editor for all image editing needs, including AI.",
        component: "FullFeaturedImageEditor",
    },
];

export default function AdvancedImageEditorIndex() {
    const [selectedEditor, setSelectedEditor] = useState<string | null>(null);

    const SelectedEditorComponent = selectedEditor ? editorComponents[selectedEditor] : null;

    return (
        <div>
            <Navbar className="top-2" />
            {!selectedEditor ? (
                <HoverEffect
                    items={editorOptions.map((editor) => ({
                        title: editor.title,
                        description: editor.description,
                        onClick: () => setSelectedEditor(editor.component),
                    }))}
                />
            ) : (
                <div className="w-full flex justify-center">
                    {SelectedEditorComponent ? <SelectedEditorComponent /> : <p>Loading editor...</p>}
                </div>
            )}
        </div>
    );
}
