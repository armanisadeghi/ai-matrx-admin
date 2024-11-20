import {GridContainerProps} from "./gridTypes";
import {GRID_CONFIG} from "@/app/(authenticated)/tests/dynamic-layouts/grid-system-12/grid-system/config";

// components/GridContainer.tsx
export const GridContainer: React.FC<GridContainerProps> = (
    {
        children,
        className = '',
        gap = GRID_CONFIG.DEFAULT_GAP,
        style = {},
    }) => {
    return (
        <div
            className={`grid w-full h-full ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(24, 1fr)',
                gridTemplateRows: 'repeat(24, 1fr)',
                gap: `${gap}px`,
                minHeight: '0',
                ...style,
            }}
        >
            {children}
        </div>
    );
};

// Strict Grid Container
export const GridContainerStrict: React.FC<GridContainerProps> = (
    {
        children,
        className = '',
        gap = GRID_CONFIG.DEFAULT_GAP,
        style = {},
    }) => {
    return (
        <div
            className={`grid w-full h-full ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', // minmax(0, 1fr) prevents expansion
                gridTemplateRows: 'repeat(24, minmax(0, 1fr))',
                gap: `${gap}px`,
                minHeight: '0',
                minWidth: '0',
                overflow: 'hidden', // Prevents overflow
                position: 'relative', // Creates new containing block
                isolation: 'isolate', // Creates new stacking context
                ...style,
            }}
        >
            {children}
        </div>
    );
};
