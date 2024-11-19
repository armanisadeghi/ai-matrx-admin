import { GridContainerProps } from "./gridTypes";

// components/GridContainer.tsx
export const GridContainer: React.FC<GridContainerProps> = ({
    children,
    className = '',
    gap = 2,
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
                minHeight: '0',  // This is crucial for proper sizing
                ...style,
            }}
        >
            {children}
        </div>
    );
};

