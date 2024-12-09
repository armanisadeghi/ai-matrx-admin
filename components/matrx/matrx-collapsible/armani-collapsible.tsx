'use client';
import React, {useState} from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    Button
} from "@/components/ui";
import {ChevronDown, ChevronRight, Minimize2, Maximize2} from "lucide-react";
import {cn} from "@/lib/utils";

interface ArmaniCollapsibleProps {
    title?: string | React.ReactNode;
    children: React.ReactNode;
    level?: number;
    icon?: React.ReactNode;
    collapsibleToChip?: boolean;
    id?: string;
    defaultExpanded?: boolean;
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
}

export function ArmaniCollapsible(
    {
        title = 'See Details',
        children,
        level = 0,
        icon,
        collapsibleToChip = false,
        id,
        defaultExpanded = false,
        className,
        triggerClassName,
        contentClassName
    }: ArmaniCollapsibleProps) {
    const [isChip, setIsChip] = useState(false);

    if (isChip) {
        return (
            <Button
                variant="secondary"
                size="sm"
                className={cn("mr-2 mb-2 inline-flex items-center gap-2", className)}
                onClick={() => setIsChip(false)}
                key={`chip-${id}`}
            >
                <Maximize2 className="h-4 w-4 text-primary"/>
                <span className="text-sm">{title}</span>
            </Button>
        );
    }

    return (
        <Collapsible
            className={cn("py-1", className)}
            key={`collapsible-${id}`}
            defaultOpen={defaultExpanded}
        >
            <CollapsibleTrigger
                className={cn(
                    "relative flex w-full items-center rounded-t-lg py-1 px-2 text-sm font-medium",
                    level === 0
                    ? "hover:bg-accent/50 hover:shadow-sm"
                    : "before:absolute before:inset-0 before:-left-4 before:rounded-t-lg hover:before:bg-accent/50 hover:shadow-sm before:-z-10",
                    triggerClassName
                )}
            >
                <div className="flex items-center gap-2">
                    {level > 0 && (
                        <div className="-ml-4">
                            {icon || <ChevronRight className="h-4 w-4"/>}
                        </div>
                    )}
                    <span>{title}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {level === 0 && collapsibleToChip && (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsChip(true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsChip(true);
                                }
                            }}
                            className="p-1 hover:bg-accent/50 rounded-sm cursor-pointer"
                            aria-label="Minimize section"
                        >
                            <Minimize2 className="h-4 w-4 text-primary"/>
                        </div>
                    )}
                    <ChevronDown
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 [data-state=open]:rotate-180"/>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent
                className={cn(
                    "overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up",
                    contentClassName
                )}
            >
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}

export default ArmaniCollapsible;
