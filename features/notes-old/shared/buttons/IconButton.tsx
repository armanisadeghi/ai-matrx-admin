// components/notes-app/core/IconButton.tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MouseEvent } from 'react';

interface IconButtonProps {
    icon: LucideIcon;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    variant?: 'default' | 'destructive' | 'ghost' | 'secondary' | 'primary';
    className?: string;
    disabled?: boolean;
}

export const IconButton = ({
    icon: Icon,
    onClick,
    variant = 'ghost',
    className,
    disabled
}: IconButtonProps) => {
    const getHoverStyle = () => {
        switch(variant) {
            case 'ghost': return 'hover:bg-primary/10';
            case 'destructive': return 'hover:bg-destructive/10 hover:text-destructive';
            case 'primary': return 'hover:bg-primary/90';
            case 'secondary': return 'hover:bg-secondary/90';
            default: return '';
        }
    };

    return (
        <Button
            variant={variant}
            size="icon"
            className={cn(
                "h-6 w-6 md:h-7 md:w-7",
                "transition-all duration-200",
                getHoverStyle(),
                className
            )}
            onClick={onClick}
            disabled={disabled}
        >
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
    );
};
