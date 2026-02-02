'use client';

import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface MessagesHeaderCompactProps {
    title?: string;
    showBack?: boolean;
    backHref?: string;
    onBack?: () => void;
}

export function MessagesHeaderCompact({ 
    title = "Chat",
    showBack = true,
    backHref = "/messages",
    onBack
}: MessagesHeaderCompactProps) {
    return (
        <div className="flex items-center gap-1 h-full bg-textured">
            {showBack && (
                onBack ? (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 hover:bg-accent gap-1"
                        onClick={onBack}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="text-sm">Back</span>
                    </Button>
                ) : (
                    <Link href={backHref}>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 hover:bg-accent gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="text-sm">Back</span>
                        </Button>
                    </Link>
                )
            )}
            {title && (
                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {title}
                </span>
            )}
        </div>
    );
}
