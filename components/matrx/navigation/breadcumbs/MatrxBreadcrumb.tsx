import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import React from 'react';
import { cn } from "@/lib/utils";

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
    
    const handleClick = (e: React.MouseEvent, itemId: string, isCurrent?: boolean) => {
        if (!isCurrent && onNavigate) {
            e.preventDefault();
            onNavigate(itemId);
        }
    };

    return (
        <Breadcrumb className={className}>
            <BreadcrumbList className="gap-1">
                {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                        <BreadcrumbItem className={cn(
                            "px-2 py-0.5 border border-border rounded-sm transition-colors",
                            item.isCurrent && "border-foreground bg-foreground text-background"
                        )}>
                            {item.isCurrent ? (
                                <BreadcrumbPage className="flex items-center gap-1.5">
                                    {item.icon}
                                    {item.label}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink 
                                    href="#" 
                                    onClick={(e) => handleClick(e, item.id, item.isCurrent)}
                                    className="flex items-center gap-1.5"
                                >
                                    {item.icon}
                                    {item.label}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default MatrxBreadcrumb;