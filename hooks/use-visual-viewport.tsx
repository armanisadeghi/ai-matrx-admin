'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to track the visual viewport height on mobile devices.
 * This accounts for browser chrome (address bar, toolbars) and keyboard appearance.
 * 
 * On mobile browsers:
 * - window.innerHeight: Static, doesn't change when keyboard appears
 * - visualViewport.height: Dynamic, changes with keyboard and browser chrome
 * 
 * @returns The current visual viewport height in pixels
 */
export function useVisualViewport() {
    const [viewportHeight, setViewportHeight] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            return window.visualViewport?.height || window.innerHeight;
        }
        return 0;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) {
            return;
        }

        const handleResize = () => {
            const height = window.visualViewport?.height || window.innerHeight;
            setViewportHeight(height);
        };

        // Listen to visual viewport changes (keyboard, browser chrome, etc.)
        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);

        // Also listen to standard resize as fallback
        window.addEventListener('resize', handleResize);

        // Initial measurement
        handleResize();

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return viewportHeight;
}

/**
 * Hook to detect if the keyboard is currently visible on mobile.
 * Uses a heuristic: if visual viewport is significantly smaller than window height,
 * the keyboard is likely open.
 * 
 * @returns Boolean indicating if keyboard is likely visible
 */
export function useKeyboardVisible() {
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const viewportHeight = useVisualViewport();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // If viewport is less than 75% of screen height, keyboard is likely visible
        const threshold = window.screen.height * 0.75;
        setKeyboardVisible(viewportHeight < threshold);
    }, [viewportHeight]);

    return keyboardVisible;
}

