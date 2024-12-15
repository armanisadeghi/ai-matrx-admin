import React, {memo} from 'react';
import {SmartButtonProps} from "../types";
import LoadingButton from '@/components/ui/loaders/loading-button';

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
        <LoadingButton
            onClick={handleClick}
            disabled={disabled}
            variant={variant}
            size={size}
            isLoading={loading}
            className="flex items-center gap-2"
            type="button"
        >
            {children}
        </LoadingButton>
    );
});

SmartButtonBase.displayName = 'SmartButtonBase';

export default SmartButtonBase;
