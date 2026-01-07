import { Loader2 } from 'lucide-react';

interface SuspenseLoaderProps {
    /** Size of the spinner */
    size?: 'xs' | 'sm' | 'md' | 'lg';
    /** Whether to center in container */
    centered?: boolean;
    /** Custom className */
    className?: string;
}

const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
};

/**
 * Minimal loading component for Suspense boundaries
 * Adaptable to any context with simple spinner animation
 */
export default function SuspenseLoader({ 
    size = 'sm', 
    centered = true,
    className = '' 
}: SuspenseLoaderProps) {
    const content = (
        <Loader2 
            className={`${sizeClasses[size]} animate-spin text-muted-foreground opacity-50 ${className}`}
            aria-label="Loading"
        />
    );

    if (centered) {
        return (
            <div className="flex items-center justify-center w-full h-full min-h-[2rem]">
                {content}
            </div>
        );
    }

    return content;
}
