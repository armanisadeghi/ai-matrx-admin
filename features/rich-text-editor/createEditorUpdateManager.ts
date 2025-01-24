import { debounce } from 'lodash';
import { extractEncodedTextFromDom } from './utils/editorUtils';
import { EditorContextValue } from './provider/provider';


export const createEditorUpdateManager = (componentId: string, context: EditorContextValue, onChange?: (text: string) => void) => {
    let lastContent: string = '';
    let updateTimeout: number | null = null;

    const handleContentUpdate = (element: HTMLDivElement) => {
        // Only extract and update if the editor exists
        if (!element) return;

        const newContent = extractEncodedTextFromDom(element);
        
        // Skip update if content hasn't changed
        if (newContent === lastContent) return;
        
        lastContent = newContent;
        context.setContent(componentId, newContent);
        onChange?.(newContent);
    };

    // Create a single debounced instance
    const debouncedUpdate = debounce(handleContentUpdate, 1000, {
        leading: false,
        trailing: true,
        maxWait: 2000
    });

    return {
        handleInput: (e: React.FormEvent<HTMLDivElement>) => {
            const element = e.currentTarget;
            const inputType = (e as unknown as InputEvent).inputType;

            // Force immediate update for critical changes
            if (
                inputType === 'deleteByCut' ||
                inputType === 'insertFromPaste' ||
                inputType === 'deleteContentBackward' ||
                inputType === 'deleteContentForward'
            ) {
                debouncedUpdate.cancel();
                handleContentUpdate(element);
                return;
            }

            // Use debounced update for regular typing
            debouncedUpdate(element);
        },

        // Force immediate update and cancel any pending
        forceUpdate: (element: HTMLDivElement) => {
            debouncedUpdate.cancel();
            handleContentUpdate(element);
        },

        // Cleanup
        cleanup: () => {
            debouncedUpdate.cancel();
        }
    };
};