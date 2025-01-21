// hooks/useColorManagement.ts
import { useState, useCallback } from 'react';
import { TAILWIND_COLORS } from '../constants';

export const useColorManagement = () => {
    const [usedColors, setUsedColors] = useState<Set<string>>(new Set());

    const getNextColor = useCallback(() => {
        const availableColors = TAILWIND_COLORS.filter(color => !usedColors.has(color));
        const randomIndex = Math.floor(Math.random() * (availableColors.length || TAILWIND_COLORS.length));
        const selectedColor = availableColors.length > 0 ? availableColors[randomIndex] : TAILWIND_COLORS[randomIndex];
        
        setUsedColors(prev => new Set(prev).add(selectedColor));
        return selectedColor;
    }, [usedColors]);

    const releaseColor = useCallback((color: string) => {
        setUsedColors(prev => {
            const next = new Set(prev);
            next.delete(color);
            return next;
        });
    }, []);

    return {
        getNextColor,
        releaseColor,
    };
};

export type ColorManagement = ReturnType<typeof useColorManagement>;