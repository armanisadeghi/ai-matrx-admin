'use client';

import React, { useEffect, useState } from 'react';
import { withRefs } from '@/lib/refs';
import RichTextEditor, { RichTextEditorProps } from '@/features/rich-text-editor/RichTextEditor';
import { useEditorContext } from './Provider';

const withManagedEditor = (BaseEditor: typeof RichTextEditor) => {
    const WrappedEditor: React.FC<RichTextEditorProps> = ({
        componentId,
        initialContent,
        ...props
    }) => {
        const context = useEditorContext();
        const [isInitialized, setIsInitialized] = useState(false);
        const [isReady, setIsReady] = useState(false);

        // Register editor on first mount only
        useEffect(() => {
            context.registerEditor(componentId, initialContent);
            setIsInitialized(true);

            return () => {
                context.unregisterEditor(componentId);
            };
        }, []);

        // Add delay to ensure editor is fully initialized
        useEffect(() => {
            if (!isInitialized) return;

            const timer = setTimeout(() => {
                setIsReady(true);
            }, 100);

            return () => clearTimeout(timer);
        }, [isInitialized]);

        if (!isReady) {
            return null;
        }

        return (
                <BaseEditor
                    componentId={componentId}
                    initialContent={initialContent}
                    {...props}
                />
        );
    };

    return withRefs(WrappedEditor);
};

const ManagedEditor = withManagedEditor(RichTextEditor);

export const EditorWithProviders: React.FC<Omit<RichTextEditorProps, 'componentId'> & { id: string }> = ({
    id,
    initialContent,
    ...props
}) => {
    return (
        <ManagedEditor
            componentId={id}
            initialContent={initialContent}
            {...props}
        />
    );
};