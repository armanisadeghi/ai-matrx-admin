// withManagedEditor.tsx
import React, { useEffect } from 'react';
import { withRefs } from '@/lib/refs';
import RichTextEditor, { RichTextEditorProps } from '../RichTextEditor';
import { useEditorContext } from './EditorProvider';
import { ChipMenuProvider } from '../components/ChipContextMenu';
import { useBrokerChipSync } from './hooks/useBrokerChipSync';


const withManagedEditor = (BaseEditor: typeof RichTextEditor) => {
    const WrappedEditor: React.FC<RichTextEditorProps> = ({
        componentId,
        initialContent,
        ...props
    }) => {
        const context = useEditorContext();
        useBrokerChipSync();

        useEffect(() => {
            context.registerEditor(componentId);
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

export const EditorWithProviders: React.FC<Omit<RichTextEditorProps, 'componentId'> & { id: string }> = ({
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