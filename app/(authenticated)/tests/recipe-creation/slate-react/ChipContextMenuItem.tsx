// components/ChipContextMenuItem.tsx
import React from 'react';
import { ContextMenuItem } from "@/components/ui/context-menu";
import { Sparkles } from 'lucide-react';

interface ChipContextMenuItemProps {
    onClick: () => void;
}

export const ChipContextMenuItem: React.FC<ChipContextMenuItemProps> = ({ onClick }) => {
    return (
        <ContextMenuItem
            onClick={onClick}
            className="flex items-center gap-2 cursor-pointer"
        >
            <Sparkles size={16} className="text-primary" />
            <span>Convert to Chip</span>
        </ContextMenuItem>
    );
};
