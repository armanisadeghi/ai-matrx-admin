import React from 'react';
import {cn} from '@/lib/utils';
import {IconArrowNarrowLeft} from "@tabler/icons-react";

export const CollapseToggleButton = (
    {
        isOpen,
        onToggle
    }: {
        isOpen: boolean;
        onToggle: () => void;
    }) => {
    return (
        <button
            onClick={onToggle}
            className={cn(
                "absolute -right-0 top-4 z-40 hidden h-5 w-5 transform items-center justify-center rounded-sm border border-neutral-200 bg-white transition duration-200 group-hover/sidebar-btn:flex dark:border-neutral-700 dark:bg-neutral-900",
                isOpen ? "rotate-0" : "rotate-180",
            )}
        >
            <IconArrowNarrowLeft className="text-black dark:text-white"/>
        </button>
    );
};

export default CollapseToggleButton;
