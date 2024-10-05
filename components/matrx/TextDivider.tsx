import React from 'react';
import {cn} from '@/lib/utils'; // Adjust this import path as needed

interface TextDividerProps {
    text: string;
    className?: string;
    lineColor?: string;
    textColor?: string;
    textSize?: string;
}

const TextDivider: React.FC<TextDividerProps> = (
    {
        text,
        className,
        lineColor,
        textColor,
        textSize
    }) => {
    return (
        <div className={cn('flex items-center w-full my-4', className)}>
            <div className={cn('flex-grow border-t', lineColor || 'border-neutral-400')}></div>
            <span className={cn('flex-shrink mx-4', textColor || 'text-neutral-400', textSize || 'text-sm')}>
        {text}
      </span>
            <div className={cn('flex-grow border-t', lineColor || 'border-neutral-400')}></div>
        </div>
    );
};

export default TextDivider;
