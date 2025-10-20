'use client';

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useComponentRef, withRefs, WithRefsProps} from '@/lib/refs';

interface ContentManagerProps extends WithRefsProps {
    onStateChange?: (isShowing: boolean) => void;
}


export const useContentManager = () => {
    const [showContent, setShowContentState] = useState(false);

    const handleShowContent = useCallback(() => {
        console.log('handleShowContent called in hook');
        const userSettings = localStorage.getItem('userSettings');
        const currentTime = new Date().getTime();
        const lastShown = localStorage.getItem('lastShown');

        if (userSettings && lastShown && currentTime - parseInt(lastShown) < 3000) {
            console.log('Showing too frequently');
            return;
        }
        localStorage.setItem('lastShown', currentTime.toString());
        setShowContentState(true);
        console.log('Content shown at:', currentTime);
    }, []);

    const handleReset = useCallback(() => {
        console.log('handleReset called in hook');
        localStorage.removeItem('lastShown');
        localStorage.removeItem('showCount');
        setShowContentState(false);
    }, []);

    const methods = useMemo(() => ({
        handleShowContent,
        handleReset
    }), [handleShowContent, handleReset]);

    return {
        showContent,
        setShowContentState,
        handleShowContent,
        handleReset,
        methods
    };
};

// components/ContentManager.tsx
const ContentManager: React.FC<ContentManagerProps> = (
    {
        onStateChange,
        componentId
    }) => {
    const {
        showContent,
        setShowContentState,
        handleShowContent,
        handleReset,
        methods
    } = useContentManager();

    useEffect(() => {
        onStateChange?.(showContent);
    }, [showContent, onStateChange]);

    useComponentRef(componentId, methods);

    return (
        <div className="p-4 border rounded">
            <h2 className="mb-4">Content Manager (ID: {componentId})</h2>
            {!showContent ? (
                <button
                    onClick={handleShowContent}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                    New
                </button>
            ) : (
                 <div className="space-y-4">
                     <div className="p-4 bg-textured rounded">Content goes here</div>
                     <div className="space-x-2">
                         <button
                             onClick={() => setShowContentState(false)}
                             className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                         >
                             Close
                         </button>
                         <button
                             onClick={handleReset}
                             className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                         >
                             Reset
                         </button>
                     </div>
                 </div>
             )}
        </div>
    );
};

// Simplified withRefs usage
export default withRefs(ContentManager);

