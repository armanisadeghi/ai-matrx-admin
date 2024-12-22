import {Breadcrumbs, BreadcrumbItem} from "@nextui-org/react";
import React from 'react';

export interface MatrxBreadcrumbItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    isCurrent?: boolean;
}

interface MatrxBreadcrumbProps {
    items: MatrxBreadcrumbItem[];
    onNavigate?: (key: string) => void;
    className?: string;
}

const MatrxBreadcrumb = (
    {
        items,
        onNavigate,
        className = ''
    }: MatrxBreadcrumbProps) => {
    return (
        <Breadcrumbs
            className={className}
            classNames={{
                list: "gap-1",
            }}
            itemClasses={{
                item: [
                    "px-2 py-0.5 border-small border-default-400 rounded-small",
                    "data-[current=true]:border-foreground data-[current=true]:bg-foreground data-[current=true]:text-background transition-colors",
                    "data-[disabled=true]:border-default-400 data-[disabled=true]:bg-default-100",
                ],
                separator: "hidden",
            }}
            size="sm"
            onAction={onNavigate}
        >
            {items.map((item) => (
                <BreadcrumbItem
                    key={item.id}
                    startContent={item.icon}
                    isCurrent={item.isCurrent}
                >
                    {item.label}
                </BreadcrumbItem>
            ))}
        </Breadcrumbs>
    );
};

export default MatrxBreadcrumb;