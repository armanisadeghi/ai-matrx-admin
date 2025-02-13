'use client';

import React, { useState, useEffect } from 'react';
import { useEditorContext } from '@/providers/rich-text-editor/Provider';
import { MatrxTableLoading } from '@/components/matrx/LoadingComponents';
import { useRefManager } from '@/lib/refs';
import RichTextEditor from '@/features/rich-text-editor/RichTextEditor';

interface RegisteredEditorProps {
    componentId: string;
    initialContent?: string;
    className?: string;
    onTextChange?: (text: string) => void;
}

export const RegisteredEditor: React.FC<RegisteredEditorProps> = ({
    componentId,
    initialContent,
    className,
    onTextChange
}) => {
    const [isRegistered, setIsRegistered] = useState(false);
    const context = useEditorContext();
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');

    useEffect(() => {
        if (!isRegistered) {
            context.registerEditor(componentId);
            setIsRegistered(true);
        }
    }, [context, isRegistered, componentId]);

    useEffect(() => {
        if (initialContent) {
            refManager.call(componentId, 'updateContent', initialContent);
        }
    }, [initialContent, componentId, refManager]);

    useEffect(() => {
        const updateText = () => {
            const text = refManager.call(componentId, 'getText');
            setCurrentText(text || '');
            onTextChange?.(text || '');
        };

        updateText();
        const interval = setInterval(updateText, 100);
        return () => clearInterval(interval);
    }, [refManager, componentId, onTextChange]);

    if (!isRegistered) {
        return <MatrxTableLoading />;
    }

    return (
        <RichTextEditor
            componentId={componentId}
            className={className}
            initialContent={initialContent}
        />
    );
};

export default RegisteredEditor;