import React, { useRef, useEffect } from 'react';
import { usePasteImageUpload } from './usePasteImageUpload';

type PasteImageHandlerProps = {
    bucket?: string;
    path?: string;
    onImagePasted?: (result: { url: string; type: string }) => void;
    targetElement?: HTMLElement | null; // Optional external element
    disabled?: boolean;
    children?: React.ReactNode;
    onProcessingChange?: (isProcessing: boolean, processRef?: any) => void;
};

export const PasteImageHandler: React.FC<PasteImageHandlerProps> = ({
    bucket = 'userContent',
    path,
    onImagePasted,
    targetElement,
    disabled = false,
    children,
    onProcessingChange
}) => {
    // Create a local ref if no target element is provided
    const localRef = useRef<HTMLDivElement>(null);
    
    // Create a ref that will be used in the hook
    const targetRef = useRef<HTMLElement | null>(targetElement || null);
    
    // Update the ref when targetElement changes
    useEffect(() => {
        if (targetElement) {
            targetRef.current = targetElement;
        } else if (localRef.current) {
            targetRef.current = localRef.current;
        }
    }, [targetElement]);

    // Use the paste hook with processing state callbacks
    const { isListening } = usePasteImageUpload({
        bucket,
        path,
        targetRef,
        onImagePasted,
        disabled,
        onProcessingChange
    });

    // If we're using a provided element, we don't need to render anything
    if (targetElement) {
        return null;
    }

    // Otherwise, render a div that will capture paste events
    return (
        <div ref={localRef} style={{ width: '100%', height: '100%' }}>
            {children}
        </div>
    );
};

export default PasteImageHandler;