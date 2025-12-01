import React from 'react';
import { SharedCanvasView } from '@/features/canvas/shared/SharedCanvasView';

export const metadata = {
    title: 'Shared Canvas',
    description: 'View and interact with shared canvas content'
};

interface PageProps {
    params: Promise<{
        token: string;
    }>;
}

export default async function SharedCanvasPage({ params }: PageProps) {
    const resolvedParams = await params;
    
    return <SharedCanvasView shareToken={resolvedParams.token} />;
}

