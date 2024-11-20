// hooks/useGridDimensions.ts
import { useState, useEffect, RefObject } from 'react';
import {GRID_CONFIG, GRID_DEFAULTS} from '../config';

interface Dimensions {
    width: number;
    height: number;
}

export const useGridDimensions = (containerRef: RefObject<HTMLDivElement>) => {
    const [dimensions, setDimensions] = useState<Dimensions>(GRID_DEFAULTS.DIMENSIONS);

    const updateDimensions = () => {
        if (containerRef.current) {
            const parent = containerRef.current.parentElement;
            if (parent) {
                const { HEIGHT: toolbarHeight, PADDING: toolbarPadding } = GRID_CONFIG.DIMENSIONS.TOOLBAR;
                const { PADDING: containerPadding } = GRID_CONFIG.DIMENSIONS.CONTAINER;

                const totalVerticalSpace = toolbarHeight + (toolbarPadding * 2) + (containerPadding * 2);
                const totalHorizontalSpace = containerPadding * 2;

                const availableHeight = parent.clientHeight - totalVerticalSpace;
                const availableWidth = parent.clientWidth - totalHorizontalSpace;

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
