"use client";

import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { FaIndent } from "react-icons/fa6";

export function PromptsPageHeader() {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <PageSpecificHeader>
                <div className="flex items-center justify-center w-full">
                    <div className="flex items-center gap-2">
                        <FaIndent className="h-5 w-5 text-primary flex-shrink-0" />
                        <h1 className="text-base font-bold text-foreground">
                            Prompts
                        </h1>
                    </div>
                </div>
            </PageSpecificHeader>
        );
    }

    // Desktop - Clean header with just title
    return (
        <PageSpecificHeader>
            <div className="flex items-center justify-center w-full">
                <div className="flex items-center gap-2">
                    <FaIndent className="h-5 w-5 text-primary flex-shrink-0" />
                    <h1 className="text-base font-bold text-foreground">
                        Prompts
                    </h1>
                </div>
            </div>
        </PageSpecificHeader>
    );
}

