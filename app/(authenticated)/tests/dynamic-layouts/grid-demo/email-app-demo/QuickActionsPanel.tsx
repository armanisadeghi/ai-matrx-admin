'use client';

import React, {useEffect, useState} from 'react';
import { DashboardArea} from '../GridLayout';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {
    Tag as Label,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    Calendar, CheckSquare, MessageCircle, MessageSquare, Bell,
} from 'lucide-react';
import ResizablePanel from "./ResizablePanel";

const COLLAPSED_WIDTH = 48;
const EXPANDED_WIDTH = 240;

const QuickActionsPanel = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentSize, setCurrentSize] = useState(COLLAPSED_WIDTH);

    const actions = [
        { icon: Calendar, label: 'Calendar' },
        { icon: CheckSquare, label: 'Tasks' },
        { icon: MessageCircle, label: 'SMS' },
        { icon: MessageSquare, label: 'WhatsApp' },
        { icon: Bell, label: 'Notifications' },
    ];

    const handleToggle = () => {
        const newSize = isExpanded ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
        setCurrentSize(newSize);
        setIsExpanded(!isExpanded);
    };

    return (
        <ResizablePanel
            defaultSize={COLLAPSED_WIDTH}
            minSize={COLLAPSED_WIDTH}
            maxSize={400}
            side="left"
            updatedSize={currentSize}
            className="border-l"
        >
            <DashboardArea className="h-full">
                <div className="flex flex-col h-full">
                    <div className={cn(
                        "flex flex-col gap-2",
                        !isExpanded && "items-center"
                    )}>
                        <Button
                            variant="ghost"
                            className={cn(
                                "relative group w-10 h-10 p-0",
                                isExpanded && "w-full justify-start pl-3"
                            )}
                            onClick={handleToggle}
                        >
                            {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>

                        {actions.map((action) => (
                            <Button
                                key={action.label}
                                variant="ghost"
                                className={cn(
                                    "relative group w-10 h-10 p-0",
                                    isExpanded && "w-full justify-start pl-3"
                                )}
                            >
                                <action.icon className="h-4 w-4" />
                                {isExpanded && (
                                    <span className="ml-3 text-sm">{action.label}</span>
                                )}
                                {!isExpanded && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded-md opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                        {action.label}
                                    </div>
                                )}
                            </Button>
                        ))}
                    </div>
                </div>
            </DashboardArea>
        </ResizablePanel>
    );
};

export default QuickActionsPanel;
