'use client';

import {getCurrentParsedPathName} from "@/utils/client-nav-utils";
import {Breadcrumbs, BreadcrumbItem} from "@heroui/react";
import {Component, ChevronRight, LucideIcon} from "lucide-react";
import Link from "next/link";
import React from "react";

export type BreadcrumbVariant = 'default' | 'minimal' | 'filled' | 'custom';

interface BreadcrumbStyles {
    container?: string;
    list?: string;
    separator?: React.ReactNode;
    item?: string[];
    icon?: LucideIcon;
}

interface AutoBreadcrumbsProps {
    variant?: BreadcrumbVariant;
    customStyles?: BreadcrumbStyles;
    size?: 'sm' | 'md' | 'lg';
    showIcons?: boolean;
}

const variantStyles: Record<BreadcrumbVariant, BreadcrumbStyles> = {
    default: {
        list: "gap-1",
        separator: <ChevronRight className="w-4 h-4 text-default-400"/>,
        item: [
            "px-2 py-0.5 border-small border-default-400 rounded-small",
            "data-[current=true]:bg-default-300 data-[current=true]:text-default-foreground",
            "data-[disabled=true]:border-default-400 data-[disabled=true]:bg-default-100",
        ],
        icon: Component,
    },
    minimal: {
        list: "gap-2",
        separator: <ChevronRight className="w-3 h-3 text-default-300"/>,
        item: [
            "px-1",
            "data-[current=true]:font-medium data-[current=true]:text-default-foreground",
            "data-[disabled=true]:text-default-400",
        ],
        icon: Component,
    },
    filled: {
        list: "gap-1",
        separator: <ChevronRight className="w-4 h-4 text-primary-400"/>,
        item: [
            "px-3 py-1 rounded-full",
            "data-[current=true]:bg-primary-100 data-[current=true]:text-primary-600",
            "data-[disabled=true]:bg-default-100 data-[disabled=true]:text-default-500",
        ],
        icon: Component,
    },
    custom: {
        list: "",
        separator: undefined,
        item: [],
        icon: Component,
    },
};

const AutoBreadcrumbs: React.FC<AutoBreadcrumbsProps> = (
    {
        variant = 'default',
        customStyles,
        size = 'sm',
        showIcons = true,
    }) => {
    const pathParts = getCurrentParsedPathName();
    const styles = variant === 'custom' ? customStyles : variantStyles[variant];

    const IconComponent = styles?.icon || Component;

    return (
        <Breadcrumbs
            className={`gap-1 ${styles?.container || ''}`}
            classNames={{
                list: styles?.list || '',
            }}
            separator={styles?.separator}
            itemClasses={{
                item: styles?.item || [],
            }}
            size={size}
        >
            {pathParts.map((part, index) => (
                <BreadcrumbItem
                    key={part.id}
                    startContent={showIcons && index === 0 ? <IconComponent className="w-4 h-4"/> : undefined}
                    isCurrent={part.isLast}
                >
                    {part.isLast ? (
                        <span>{part.name}</span>
                    ) : (
                        <Link href={part.href}>
                            {part.name}
                        </Link>
                    )}
                </BreadcrumbItem>
            ))}
        </Breadcrumbs>
    );
};

export default AutoBreadcrumbs;