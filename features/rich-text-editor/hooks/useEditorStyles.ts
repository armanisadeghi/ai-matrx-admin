// useEditorStyles.ts
import { useCallback } from 'react';
import { TextStyle } from '../types/editor.types';
import { applyTextStyle } from '../utils/editorUtils';
import { useEditorContext } from '../provider/EditorProvider';
import { getEditorElement } from '../utils/editorUtils';

export const useEditorStyles = (
    editorId: string,
    { updatePlainTextContent }: {
        updatePlainTextContent: () => void;
    }
) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);

    const handleStyleChange = useCallback(
        (style: TextStyle) => {
            const editor = getEditorElement(editorId);
            if (!editor) return;
            
            applyTextStyle(style);
            editor.focus();
            updatePlainTextContent();
        },
        [editorId, updatePlainTextContent]
    );

    return {
        handleStyleChange
    };
};