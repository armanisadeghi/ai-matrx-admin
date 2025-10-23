'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect virtual keyboard visibility
 * Useful for Tesla browser and mobile devices
 * 
 * @returns {Object} Object containing:
 *   - isKeyboardVisible: boolean indicating if virtual keyboard is shown
 *   - keyboardHeight: estimated height of the keyboard in pixels
 * 
 * @example
 * const { isKeyboardVisible, keyboardHeight } = useVirtualKeyboard();
 * 
 * // Use it to conditionally render UI or adjust styles
 * if (isKeyboardVisible) {
 *   // Adjust UI when keyboard is visible
 * }
 */
export function useVirtualKeyboard() {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        // Check if Visual Viewport API is supported (modern browsers, Tesla browser)
        if (!window.visualViewport) {
            // Fallback: use resize events
            const handleResize = () => {
                const viewportHeight = window.innerHeight;
                const documentHeight = document.documentElement.clientHeight;
                const heightDiff = documentHeight - viewportHeight;
                
                // If height difference is significant, keyboard is likely visible
                const isVisible = heightDiff > 150;
                setIsKeyboardVisible(isVisible);
                setKeyboardHeight(isVisible ? heightDiff : 0);
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }

        // Use Visual Viewport API for accurate keyboard detection
        const viewport = window.visualViewport;

        const handleViewportChange = () => {
            const windowHeight = window.innerHeight;
            const viewportHeight = viewport.height;
            const heightDiff = windowHeight - viewportHeight;

            // Keyboard is visible if viewport height is significantly smaller than window height
            const isVisible = heightDiff > 100;
            setIsKeyboardVisible(isVisible);
            setKeyboardHeight(isVisible ? heightDiff : 0);
        };

        viewport.addEventListener('resize', handleViewportChange);
        viewport.addEventListener('scroll', handleViewportChange);

        // Initial check
        handleViewportChange();

        return () => {
            viewport.removeEventListener('resize', handleViewportChange);
            viewport.removeEventListener('scroll', handleViewportChange);
        };
    }, []);

    return { isKeyboardVisible, keyboardHeight };
}

/**
 * Hook that provides a ref callback to ensure an element stays visible when keyboard appears
 * Automatically scrolls the element into view when keyboard is shown
 * 
 * @example
 * const inputRef = useKeyboardAwareScroll<HTMLInputElement>();
 * return <input ref={inputRef} ... />;
 */
export function useKeyboardAwareScroll<T extends HTMLElement>() {
    const [element, setElement] = useState<T | null>(null);
    const { isKeyboardVisible } = useVirtualKeyboard();

    useEffect(() => {
        if (!element || !isKeyboardVisible) return;

        // Small delay to let the keyboard render
        const timeoutId = setTimeout(() => {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [element, isKeyboardVisible]);

    return setElement;
}

