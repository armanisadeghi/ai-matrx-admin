// hooks/useInteractionTracking.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface TrackedInteraction {
    selector: string;
    timestamp: string;
    text?: string;
}

export const useInteractionTracking = () => {
    const [lastClicked, setLastClicked] = useState<TrackedInteraction>();
    const [lastHovered, setLastHovered] = useState<TrackedInteraction>();

    const getElementInfo = useCallback((element: Element): TrackedInteraction => {
        // Safe class name handling
        let classNames = '';
        if (element instanceof HTMLElement && element.className) {
            classNames = typeof element.className === 'string'
                         ? `.${element.className.trim().split(/\s+/).join('.')}`
                         : '';
        }

        // Build selector
        const selector = [
            element.tagName.toLowerCase(),
            element.id ? `#${element.id}` : '',
            classNames
        ].filter(Boolean).join('');

        // Get relevant attributes
        const attributes: string[] = [];
        if (element instanceof HTMLElement) {
            if (element.getAttribute('role')) attributes.push(`[role="${element.getAttribute('role')}"]`);
            if (element.getAttribute('aria-label')) attributes.push(`[aria-label="${element.getAttribute('aria-label')}"]`);
        }

        return {
            selector: `${selector}${attributes.join('')}`,
            timestamp: new Date().toISOString(),
            text: element.textContent?.trim() || undefined
        };
    }, []);

    useEffect(() => {
        let clickTimeout: NodeJS.Timeout;
        let hoverTimeout: NodeJS.Timeout;
        let isActive = true;

        const clickHandler = (e: MouseEvent) => {
            if (!isActive) return;
            clearTimeout(clickTimeout);

            clickTimeout = setTimeout(() => {
                const element = e.target as Element;
                if (element) {
                    try {
                        setLastClicked(getElementInfo(element));
                    } catch (error) {
                        console.error('Error tracking click:', error);
                    }
                }
            }, 100);
        };

        const hoverHandler = (e: MouseEvent) => {
            if (!isActive) return;
            clearTimeout(hoverTimeout);

            hoverTimeout = setTimeout(() => {
                const element = e.target as Element;
                if (element) {
                    try {
                        setLastHovered(getElementInfo(element));
                    } catch (error) {
                        console.error('Error tracking hover:', error);
                    }
                }
            }, 200);
        };

        document.addEventListener('click', clickHandler, { passive: true });
        document.addEventListener('mouseover', hoverHandler, { passive: true });

        return () => {
            isActive = false;
            clearTimeout(clickTimeout);
            clearTimeout(hoverTimeout);
            document.removeEventListener('click', clickHandler);
            document.removeEventListener('mouseover', hoverHandler);
        };
    }, [getElementInfo]);

    return { lastClicked, lastHovered };
};
