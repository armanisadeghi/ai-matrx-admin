import { useEffect, useCallback, useRef, useState } from 'react';
import { useFileUploadWithStorage } from './useFileUploadWithStorage';

type PasteImageUploadProps = {
    bucket?: string;
    path?: string;
    targetRef: React.RefObject<HTMLElement>;
    onImagePasted?: (result: { url: string; type: string }) => void;
    disabled?: boolean;
    onProcessingChange?: (isProcessing: boolean, processRef?: any) => void;
};

export const usePasteImageUpload = ({
    bucket = 'userContent',
    path,
    targetRef,
    onImagePasted,
    disabled = false,
    onProcessingChange
}: PasteImageUploadProps) => {
    const { uploadFile } = useFileUploadWithStorage(bucket, path);
    const isProcessingRef = useRef(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Create a cancelable process object
    const createProcessRef = useCallback(() => {
        abortControllerRef.current = new AbortController();
        return {
            cancel: () => {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    abortControllerRef.current = null;
                    updateProcessingState(false);
                }
            },
            signal: abortControllerRef.current.signal
        };
    }, []);

    // Update the processing state and notify via callback
    const updateProcessingState = useCallback((processing: boolean, processRef?: any) => {
        isProcessingRef.current = processing;
        setIsProcessing(processing);
        if (onProcessingChange) {
            onProcessingChange(processing, processRef);
        }
    }, [onProcessingChange]);

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        if (disabled || isProcessingRef.current) return;
        
        const items = event.clipboardData?.items;
        if (!items) return;

        // Look for image content
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Only process image items
            if (item.type.indexOf('image') === -1) continue;
            
            // Prevent default paste behavior
            event.preventDefault();
            
            // Create a process reference for cancellation
            const processRef = createProcessRef();
            
            // Set processing flag
            updateProcessingState(true, processRef);
            
            try {
                // Get the image as a file
                const file = item.getAsFile();
                if (!file) continue;

                // Generate a unique filename with timestamp
                const timestamp = new Date().getTime();
                const fileName = `pasted_image_${timestamp}.png`;
                
                // Create a new file with the generated name to avoid nameless files
                const namedFile = new File([file], fileName, { type: file.type });

                // Periodically check if the operation was cancelled
                const checkCancellation = setInterval(() => {
                    if (abortControllerRef.current?.signal.aborted) {
                        clearInterval(checkCancellation);
                        throw new DOMException("Aborted", "AbortError");
                    }
                }, 100);

                // Upload the file
                const result = await uploadFile(namedFile);
                
                // Clear the cancellation check
                clearInterval(checkCancellation);
                
                if (result && onImagePasted && !abortControllerRef.current?.signal.aborted) {
                    onImagePasted(result);
                }
            } catch (error) {
                if ((error as any).name === 'AbortError') {
                    console.log('Image upload was cancelled');
                } else {
                    console.error('Error processing pasted image:', error);
                }
            } finally {
                // Only reset if not already aborted (to avoid double state updates)
                if (!abortControllerRef.current?.signal.aborted) {
                    abortControllerRef.current = null;
                    updateProcessingState(false);
                }
            }
        }
    }, [disabled, uploadFile, onImagePasted, updateProcessingState, createProcessRef]);

    useEffect(() => {
        const element = targetRef.current;
        if (!element || disabled) return;

        // Add the paste event listener to the target element
        element.addEventListener('paste', handlePaste as EventListener);
        
        // Clean up
        return () => {
            element.removeEventListener('paste', handlePaste as EventListener);
            // Cancel any ongoing upload if component unmounts
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [targetRef, handlePaste, disabled]);

    return {
        isListening: !disabled,
        isProcessing,
    };
};

export default usePasteImageUpload;