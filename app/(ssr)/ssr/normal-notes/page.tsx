// app/(authenticated)/notes/page.tsx
'use client';

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotesLayout } from "@/features/notes";
import MobileNotesView from "@/features/notes/components/mobile/MobileNotesView";

/**
 * Notes Page - Main notes management interface
 * 
 * Route: /notes
 * 
 * Automatically switches between desktop and mobile views based on screen size
 */
export default function NotesPage() {
    const isMobile = useIsMobile();

    // Mobile view - iOS-inspired single-column navigation
    if (isMobile) {
        return <MobileNotesView />;
    }

    // Desktop view - Sidebar + editor layout
    return <NotesLayout />;
}
