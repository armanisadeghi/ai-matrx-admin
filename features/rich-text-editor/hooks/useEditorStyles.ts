// useEditorStyles.ts
import { useCallback } from 'react';
import { TextStyle } from '../types/editor.types';
import { applyTextStyle } from '../utils/editorUtils';
import { useEditorContext } from '../provider/provider';
import { getEditorElement } from '../utils/editorUtils';

export const useEditorStyles = (
    editorId: string,
    { updateEncodedText }: {
        updateEncodedText: () => void;
    }
) => {
    const context = useEditorContext();

    const handleStyleChange = useCallback(
        (style: TextStyle) => {
            const editor = getEditorElement(editorId);
            if (!editor) return;
            
            applyTextStyle(style);
            editor.focus();
            updateEncodedText();
        },
        [editorId, updateEncodedText]
    );

    return {
        handleStyleChange
    };
};