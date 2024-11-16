'use client';

import { useState, useCallback, useMemo } from 'react';
import {useComponentRef, withRefs, WithRefsProps} from '@/lib/refs';



export const useActionPanel = () => {
    const [showButton, setShowButton] = useState(true);

    const toggleButton = useCallback(() => {
        setShowButton(prev => !prev);
    }, []);

    const show = useCallback(() => {
        setShowButton(true);
    }, []);

    const hide = useCallback(() => {
        setShowButton(false);
    }, []);

    const methods = useMemo(() => ({
        showButton: show,
        hideButton: hide
    }), [show, hide]);

    return {
        showButton,
        toggleButton,
        show,
        hide,
        methods // Return methods object for ref system
    };
};


interface ActionPanelProps extends WithRefsProps {
    onCreateNew: () => void;
    onReset: () => void;
    forceHide?: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
                                                     onCreateNew,
                                                     onReset,
                                                     forceHide,
                                                     componentId
                                                 }) => {
    const { showButton, toggleButton, methods } = useActionPanel();
    const isVisible = showButton && !forceHide;

    // Use the hook's methods for the ref system
    useComponentRef(componentId, methods);

    return (
        <div className="p-4 border rounded">
            <h2 className="mb-4">Action Panel (ID: {componentId})</h2>
            <div className="space-x-2">
                {isVisible && (
                    <button
                        onClick={onCreateNew}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Create New
                    </button>
                )}
                <button
                    onClick={toggleButton}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    {showButton ? 'Hide Button' : 'Show Button'}
                </button>
                <button
                    onClick={onReset}
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                >
                    Reset All
                </button>
            </div>
        </div>
    );
};

// Simplified withRefs usage - no hooks here
export default withRefs(ActionPanel);
