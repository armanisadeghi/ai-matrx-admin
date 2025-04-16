"use client";
import React, { useState, ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ChatCollapsibleWrapperProps {
    icon: ReactNode;
    title: string;
    initialOpen?: boolean;
    onStateChange?: (state: any) => void;
    children: ReactNode;
    className?: string;
}

const ChatCollapsibleWrapper: React.FC<ChatCollapsibleWrapperProps> = ({
    icon,
    title,
    initialOpen = true,
    onStateChange,
    children,
    className = "",
}) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    const { toast } = useToast();

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (onStateChange) {
            onStateChange(open);
        }
    };

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={handleOpenChange}
            className={`border-3 border-zinc-200 dark:border-zinc-700 rounded-3xl shadow-sm my-4 w-full max-w-3xl ${className}`}
        >
            <CollapsibleTrigger className="relative flex w-full items-center justify-between rounded-t-lg py-3 px-4 font-medium hover:bg-accent/50 hover:shadow-sm">
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{title}</span>
                </div>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </CollapsibleTrigger>
            <CollapsibleContent className="bg-transparent dark:bg-transparent overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up border-none">
                <div className="relative p-2 border-none">
                    <div className="absolute top-0 left-8 right-8 h-px bg-zinc-200 dark:bg-zinc-700"></div>
                    {children}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default ChatCollapsibleWrapper;
