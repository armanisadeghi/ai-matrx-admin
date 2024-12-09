// group.tsx
import {cn} from "@/lib/utils";
import React from "react";
import ArmaniCollapsible from "./armani-collapsible";

interface CollapsibleItem {
    title: string | React.ReactNode;
    content?: React.ReactNode;
    items?: CollapsibleItem[];
    icon?: React.ReactNode;
}

interface ArmaniCollapsibleGroupProps {
    title: string | React.ReactNode;
    content?: React.ReactNode; // Add direct content support
    items?: CollapsibleItem[];
    level?: number;
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
    itemClassName?: string;
    collapsibleToChip?: boolean;
    id?: string;
    defaultExpanded?: boolean;
}

function CollapsibleItems(
    {
        items,
        level = 0,
        collapsibleToChip = false,
        defaultExpanded = false,
        className,
        triggerClassName,
        contentClassName,
        itemClassName
    }: {
        items: CollapsibleItem[],
        level?: number,
        collapsibleToChip?: boolean,
        defaultExpanded?: boolean,
        className?: string,
        triggerClassName?: string,
        contentClassName?: string,
        itemClassName?: string
    }) {
    return (
        <div className={cn(level > 0 && "pl-4")}>
            {items.map((item, index) => (
                <div
                    key={index}
                    className={cn(
                        index < items.length - 1 && "border-b border-border",
                        itemClassName
                    )}
                >
                    <ArmaniCollapsible
                        title={item.title}
                        level={level}
                        icon={item.icon}
                        collapsibleToChip={collapsibleToChip}
                        id={`${index}-${item.title?.toString()}`}
                        defaultExpanded={defaultExpanded}
                        className={className}
                        triggerClassName={triggerClassName}
                        contentClassName={contentClassName}
                    >
                        <div className="space-y-4">
                            {item.content && (
                                <div>{item.content}</div>
                            )}
                            {item.items && (
                                <CollapsibleItems
                                    items={item.items}
                                    level={level + 1}
                                    collapsibleToChip={collapsibleToChip}
                                    defaultExpanded={defaultExpanded}
                                    className={className}
                                    triggerClassName={triggerClassName}
                                    contentClassName={contentClassName}
                                    itemClassName={itemClassName}
                                />
                            )}
                        </div>
                    </ArmaniCollapsible>
                </div>
            ))}
        </div>
    );
}

export function ArmaniCollapsibleGroup(
    {
        title,
        content,
        items,
        level = 0,
        className,
        triggerClassName,
        contentClassName,
        itemClassName,
        collapsibleToChip = false,
        id,
        defaultExpanded = false
    }: ArmaniCollapsibleGroupProps) {
    return (
        <ArmaniCollapsible
            title={title}
            level={level}
            collapsibleToChip={collapsibleToChip}
            id={id}
            defaultExpanded={defaultExpanded}
            className={className}
            triggerClassName={triggerClassName}
            contentClassName={contentClassName}
        >
            <div className="space-y-4">
                {content && (
                    <div>{content}</div>
                )}
                {items && items.length > 0 && (
                    <CollapsibleItems
                        items={items}
                        level={level + 1}
                        collapsibleToChip={collapsibleToChip}
                        defaultExpanded={defaultExpanded}
                        className={className}
                        triggerClassName={triggerClassName}
                        contentClassName={contentClassName}
                        itemClassName={itemClassName}
                    />
                )}
            </div>
        </ArmaniCollapsible>
    );
}

export default ArmaniCollapsibleGroup;
