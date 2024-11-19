// hooks/useGridDimensions.ts
import { useState, useEffect, RefObject } from 'react';
import { GRID_CONFIG } from '../config';

interface Dimensions {
    width: number;
    height: number;
}

export const useGridDimensions = (containerRef: RefObject<HTMLDivElement>) => {
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

    const updateDimensions = () => {
        if (containerRef.current) {
            const parent = containerRef.current.parentElement;
            if (parent) {
                const adminBarHeight = GRID_CONFIG.TOOLBAR_HEIGHT;
                const padding = GRID_CONFIG.CONTAINER_PADDING;
                const availableHeight = parent.clientHeight - adminBarHeight - (padding * 2);
                const availableWidth = parent.clientWidth - (padding * 2);
                setDimensions({
                    width: availableWidth,
                    height: availableHeight
                });
            }
        }
    };

    useEffect(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    return { dimensions, updateDimensions };
};
