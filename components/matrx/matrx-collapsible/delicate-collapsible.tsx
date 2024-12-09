// components/matrx/MatrxCollapsible.tsx
import React, {useState} from 'react';
import {Card} from '@/components/ui/card';
import {ChevronRight, Loader2, AlertCircle} from 'lucide-react';
import {cn} from "@/lib/utils";

interface DelicateMatrxCollapsibleProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    defaultOpen?: boolean;
    loading?: boolean;
    error?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}

export function DelicateMatrxCollapsible(
    {
        title,
        children,
        className = '',
        defaultOpen = true,
        loading = false,
        error = false,
        onOpenChange
    }: DelicateMatrxCollapsibleProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const handleToggle = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        onOpenChange?.(newState);
    };

    return (
        <Card className={cn("w-full bg-card", className)}>
            <div
                className="p-3 border-b border-border cursor-pointer flex items-center justify-between"
                onClick={handleToggle}
            >
                <div className="flex items-center gap-2">
                    <ChevronRight
                        className={cn(
                            "h-4 w-4 transition-transform",
                            isOpen && "rotate-90"
                        )}
                    />
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {loading && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500 dark:text-blue-400"/>
                    )}
                    {error && (
                        <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400"/>
                    )}
                </div>
            </div>
            {isOpen && <div className="p-3">{children}</div>}
        </Card>
    );
}

export default DelicateMatrxCollapsible;
