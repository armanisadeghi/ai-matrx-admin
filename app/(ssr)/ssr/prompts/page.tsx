"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { initializeUserPrompts } from "@/lib/redux/thunks/promptCrudThunks";
import PromptsSSRHeader from "./_components/PromptsSSRHeader";
import { PromptsGrid } from "@/features/prompts/components/layouts/PromptsGrid";

export default function PromptsPage() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(initializeUserPrompts());
    }, [dispatch]);

    return (
        <div
            className="ssr-prompt-page"
            style={{
                '--header-height': 'var(--shell-header-h)',
                paddingTop: 'var(--shell-header-h)',
            } as React.CSSProperties}
        >
            <PromptsSSRHeader />
            <div className="w-full">
                <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 max-w-[1800px]">
                    <PromptsGrid />
                </div>
            </div>
        </div>
    );
}
