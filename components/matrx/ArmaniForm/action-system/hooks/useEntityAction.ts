import { useState, useCallback } from 'react';

export const useEntityAction = () => {
    // State for action management
    const [isOpen, setIsOpen] = useState(false); // Open/close state
    const [status, setStatus] = useState('idle'); // Action status: 'idle', 'started', 'updated', 'completed'
    const [result, setResult] = useState(null); // Final result of the action
    const [context, setContext] = useState({
        entityKey: null,
        selectionMode: 'single', // Default to single selection
        selectedRecordIds: [],
        selectedRecords: [],
    });

    // Handler to update the action state
    const updateStatus = useCallback((newStatus) => {
        setStatus(newStatus);
    }, []);

    // Handler to set the result of the action
    const handleResult = useCallback((data) => {
        setResult(data);

        // Automatically update context from the result, if provided
        if (data?.entityKey || data?.selectedRecords) {
            setContext((prev) => ({
                ...prev,
                ...data, // Merge new data
            }));
        }
    }, []);

    // Handlers for open/close state
    const handleOpen = useCallback(() => {
        setIsOpen(true);
        updateStatus('started');
    }, [updateStatus]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        updateStatus('completed');
    }, [updateStatus]);

    // Expose all handlers and state
    return {
        isOpen,
        status,
        result,
        context,
        handleOpen,
        handleClose,
        updateStatus,
        handleResult,
    };
};
