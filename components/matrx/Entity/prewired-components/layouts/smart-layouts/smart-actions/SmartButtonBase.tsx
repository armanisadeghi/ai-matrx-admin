import React from 'react';
import {Button} from 'components/ui/';
import {Loader2} from 'lucide-react';
import {memo} from 'react';
import {SmartButtonProps} from "./types";

export const SmartButtonBase = memo((
    {
        children,
        onClick,
        disabled = false,
        variant = 'default',
        size = 'default',
        loading = false,
    }: SmartButtonProps) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
    };

    return (
        <Button
            onClick={handleClick}
            disabled={disabled || loading}
            variant={variant}
            size={size}
            className="flex items-center gap-2"
            type="button"
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
            {children}
        </Button>
    );
});

SmartButtonBase.displayName = 'SmartButtonBase';

export default SmartButtonBase;
