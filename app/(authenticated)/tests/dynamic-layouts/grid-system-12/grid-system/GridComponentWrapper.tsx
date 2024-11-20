
// WRAPPER ADDED FOR STRICT MODE


// components/GridComponentWrapper.tsx
interface GridComponentWrapperProps {
    children: React.ReactNode;
    className?: string;
}

// Added to the system to try and enforce more strictness for the grid.

export const GridComponentWrapper: React.FC<GridComponentWrapperProps> = (
    {
        children,
        className = ''
    }) => {
    return (
        <div
            className={`
                w-full 
                h-full 
                overflow-auto 
                flex 
                flex-col 
                min-w-0 
                min-h-0
                ${className}
            `}
        >
            {children}
        </div>
    );
};
