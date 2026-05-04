import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useFileUploadWithStorage } from './useFileUploadWithStorage';

type SaveToOption = 'public' | 'private'; // New type for saveTo prop

/**
 * Shape passed to `onImagePasted`. `url` is the embeddable direct-file
 * URL (`/api/share/<token>/file`) — drop into `<img src>`, `<video>`,
 * `<a href>`, etc. and the browser does the right thing.
 *
 * `pageUrl` is the optional HTML landing page (`/share/<token>`) for
 * "click here to view file metadata" surfaces. `fileId` is the
 * canonical cld_files UUID — prefer it for AI API calls.
 *
 * Type kept loose / additive on top of the historical `{ url, type }`
 * shape so existing consumers continue to compile unchanged. New
 * consumers can pick up the extra fields.
 */
export interface PasteImageUploadResult {
    url: string;
    type: string;
    fileId?: string;
    pageUrl?: string;
}

type PasteImageUploadProps = {
    bucket?: string;
    path?: string;
    saveTo?: SaveToOption; // New optional prop to override bucket and path
    targetRef: React.RefObject<HTMLElement>;
    onImagePasted?: (result: PasteImageUploadResult) => void;
    /**
     * Called when the upload fails. If omitted, a toast is shown with the
     * real backend error so the user always knows what happened.
     */
    onError?: (message: string) => void;
    disabled?: boolean;
    onProcessingChange?: (isProcessing: boolean, processRef?: any) => void;
};

export const usePasteImageUpload = ({
    bucket = 'userContent',
    path,
    saveTo, // Add saveTo to destructured props
    targetRef,
    onImagePasted,
    onError,
    disabled = false,
    onProcessingChange
}: PasteImageUploadProps) => {
    // Initialize useFileUploadWithStorage with default bucket and path
    const {
        uploadFile,
        uploadToPublicUserAssets,
        uploadToPrivateUserAssets,
        lastErrorRef
    } = useFileUploadWithStorage(bucket, path);
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

                // Upload the file based on saveTo prop
                let result;
                if (saveTo === 'public') {
                    result = await uploadToPublicUserAssets(namedFile);
                } else if (saveTo === 'private') {
                    result = await uploadToPrivateUserAssets(namedFile);
                } else {
                    result = await uploadFile(namedFile); // Fallback to default behavior
                }
                
                // Clear the cancellation check
                clearInterval(checkCancellation);
                
                if (result && onImagePasted && !abortControllerRef.current?.signal.aborted) {
                    onImagePasted(result);
                } else if (!result && !abortControllerRef.current?.signal.aborted) {
                    // Hook caught the error and returned null — surface it.
                    const reason = lastErrorRef.current ?? 'Upload failed';
                    if (onError) {
                        onError(reason);
                    } else {
                        toast.error(`Couldn't upload pasted image: ${reason}`);
                    }
                }
            } catch (error) {
                if ((error as any).name === 'AbortError') {
                    console.log('Image upload was cancelled');
                } else {
                    const reason =
                        error instanceof Error ? error.message : 'Upload failed';
                    console.error('Error processing pasted image:', error);
                    if (onError) {
                        onError(reason);
                    } else {
                        toast.error(`Couldn't upload pasted image: ${reason}`);
                    }
                }
            } finally {
                // Only reset if not already aborted (to avoid double state updates)
                if (!abortControllerRef.current?.signal.aborted) {
                    abortControllerRef.current = null;
                    updateProcessingState(false);
                }
            }
        }
    }, [
        disabled,
        uploadFile,
        uploadToPublicUserAssets, // Add new upload methods to dependencies
        uploadToPrivateUserAssets,
        saveTo, // Add saveTo to dependencies
        onImagePasted,
        onError,
        updateProcessingState,
        createProcessRef,
        lastErrorRef,
    ]);

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