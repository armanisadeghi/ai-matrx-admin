// withManagedEditor.tsx
import React, { useEffect } from 'react';
import { WithRefsProps, withRefs } from '@/lib/refs';
import RichTextEditor from './RichTextEditor';
import { useEditorContext } from './provider/EditorProvider';
import { ChipMenuProvider } from './components/ChipContextMenu';

interface ManagedEditorProps extends WithRefsProps {
    initialContent?: string;
    onChange?: (content: string) => void;
    className?: string;
}

const withManagedEditor = (BaseEditor: typeof RichTextEditor) => {
    const WrappedEditor: React.FC<ManagedEditorProps> = ({
        componentId,
        initialContent,
        ...props
    }) => {
        const context = useEditorContext();

        useEffect(() => {
            context.registerEditor(componentId);
            return () => context.unregisterEditor(componentId);
        }, []);

        return (
            <ChipMenuProvider>
                <BaseEditor
                    componentId={componentId}
                    initialContent={initialContent}
                    {...props}
                />
            </ChipMenuProvider>
        );
    };

    return withRefs(WrappedEditor);
};

const ManagedEditor = withManagedEditor(RichTextEditor);

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