// withManagedEditor.tsx
import React, { useEffect } from 'react';
import { WithRefsProps, withRefs } from '@/lib/refs';

import RichTextEditor from './RichTextEditor';
import { useEditorContext } from './provider/EditorProvider';

interface ManagedEditorProps extends WithRefsProps {
    initialContent?: string;
    onChange?: (content: string) => void;
    className?: string;
    // Add any other editor-specific props here
}

// This wrapper combines both provider and ref management
const withManagedEditor = (BaseEditor: typeof RichTextEditor) => {
    const WrappedEditor: React.FC<ManagedEditorProps> = ({
        componentId,
        initialContent,
        ...props
    }) => {
        const context = useEditorContext();

        // Registration is now handled automatically when the editor mounts
        useEffect(() => {
            // Register the editor
            context.registerEditor(componentId);
            return () => context.unregisterEditor(componentId);
        }, []);

        return (
            <BaseEditor
                componentId={componentId}
                initialContent={initialContent}
                {...props}
            />
        );
    };

    // Combine withRefs and our management
    return withRefs(WrappedEditor);
};

// Create the managed editor component
const ManagedEditor = withManagedEditor(RichTextEditor);

// Export a convenience wrapper that includes both providers
export const EditorWithProviders: React.FC<Omit<ManagedEditorProps, 'componentId'> & { id: string }> = ({
    id,
    ...props
}) => {
    return (
        <ManagedEditor
            componentId={id}
            {...props}
        />
    );
};

