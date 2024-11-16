'use client';

import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';

// Interfaces for ComponentThree
interface ComponentThreeProps {
    onStateChange?: (isShowing: boolean) => void;
}

export interface ComponentThreeRef {
    handleShowContent: () => void;
    handleReset: () => void;
}

const ComponentThree = forwardRef<ComponentThreeRef, ComponentThreeProps>((props, ref) => {
    const [showContent, setShowContentState] = useState(false);

    // Notify parent of state changes
    useEffect(() => {
        props.onStateChange?.(showContent);
    }, [showContent]);

    const handleShowContent = () => {
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
    };

    const handleReset = () => {
        localStorage.removeItem('lastShown');
        localStorage.removeItem('showCount');
        setShowContentState(false);
        console.log('Component reset at:', new Date().getTime());
    };

    // Expose multiple methods through the ref
    useImperativeHandle(ref, () => ({
        handleShowContent,
        handleReset
    }));

    return (
        <div className="p-4 border rounded">
            <h2 className="mb-4">Component Three</h2>
            {!showContent ? (
                <button
                    onClick={handleShowContent}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                    New
                </button>
            ) : (
                 <div className="space-y-4">
                     <div className="p-4 bg-gray-100 rounded">Content goes here</div>
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
});

// Interfaces for ComponentTwo
interface ComponentTwoProps {
    onCreateNew: () => void;
    onReset: () => void;
    forceHide?: boolean;
}

export interface ComponentTwoRef {
    showButton: () => void;
    hideButton: () => void;
}

const ComponentTwo = forwardRef<ComponentTwoRef, ComponentTwoProps>((props, ref) => {
    const [showButton, setShowButton] = useState(true);

    // Internal button visibility management
    useImperativeHandle(ref, () => ({
        showButton: () => setShowButton(true),
        hideButton: () => setShowButton(false)
    }));

    // Component manages its own visibility but also respects external forceHide
    const isVisible = showButton && !props.forceHide;

    return (
        <div className="p-4 border rounded">
            <h2 className="mb-4">Component Two</h2>
            <div className="space-x-2">
                {isVisible && (
                    <button
                        onClick={props.onCreateNew}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Create New
                    </button>
                )}
                <button
                    onClick={() => setShowButton(!showButton)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    {showButton ? 'Hide Button' : 'Show Button'}
                </button>
                <button
                    onClick={props.onReset}
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                >
                    Reset All
                </button>
            </div>
        </div>
    );
});

const ComponentOne: React.FC = () => {
    const componentThreeRef = useRef<ComponentThreeRef>(null);
    const componentTwoRef = useRef<ComponentTwoRef>(null);
    const [hideCreateButton, setHideCreateButton] = useState(false);

    const handleShowContent = () => {
        componentThreeRef.current?.handleShowContent();
    };

    const handleReset = () => {
        componentThreeRef.current?.handleReset();
    };

    // Handler for ComponentThree's state changes
    const handleComponentThreeStateChange = (isShowing: boolean) => {
        setHideCreateButton(isShowing);
    };

    return (
        <div className="space-y-4">
            <ComponentTwo
                ref={componentTwoRef}
                onCreateNew={handleShowContent}
                onReset={handleReset}
                forceHide={hideCreateButton}
            />
            <ComponentThree
                ref={componentThreeRef}
                onStateChange={handleComponentThreeStateChange}
            />
        </div>
    );
};

export default ComponentOne;
