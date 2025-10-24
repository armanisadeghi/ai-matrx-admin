// app/(authenticated)/transcripts/page.tsx
"use client";

import React from "react";
import { TranscriptsLayout } from "@/features/transcripts";

/**
 * Transcripts Page - Main transcript management interface
 *
 * Route: /transcripts
 */
export default function TranscriptsPage() {
    return (
        <div className="h-full w-full overflow-hidden">
            <TranscriptsLayout className="h-full" />
        </div>
    );
}
