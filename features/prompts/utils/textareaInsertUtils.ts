/**
 * Inserts text at the current cursor position in a textarea
 * @param textarea - The textarea element
 * @param text - The text to insert
 * @returns boolean - Success status
 */
export const insertTextAtTextareaCursor = (textarea: HTMLTextAreaElement, text: string): boolean => {
    try {
        if (!textarea) {
            console.error('Textarea not found');
            return false;
        }

        // Get current cursor position
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;

        // Insert text at cursor position
        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
        
        // Get the React instance's setter function from the textarea
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        )?.set;
        
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(textarea, newValue);
        } else {
            textarea.value = newValue;
        }
        
        // Set cursor position after inserted text
        const newCursorPos = start + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger React's onChange by dispatching multiple events
        // This ensures React's synthetic event system picks it up
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        
        textarea.dispatchEvent(inputEvent);
        textarea.dispatchEvent(changeEvent);
        
        // Focus textarea
        textarea.focus();
        
        return true;
    } catch (error) {
        console.error('Error inserting text:', error);
        return false;
    }
};

/**
 * Inserts text into a textarea by ref
 * @param textareaRef - React ref to the textarea
 * @param text - The text to insert
 * @returns boolean - Success status
 */
export const insertTextByRef = (
    textareaRef: HTMLTextAreaElement | null,
    text: string
): boolean => {
    if (!textareaRef) return false;
    return insertTextAtTextareaCursor(textareaRef, text);
};

