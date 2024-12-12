// app/(authenticated)/tests/ssr-test/[category]/[id]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import FlashcardComponent from "@/app/(authenticated)/flash-cards/components/FlashcardComponent";

interface PageProps {
    params: Promise<{
        category: string;
        id: string;
    }>;
    searchParams: Promise<{
        optionName?: string;
        [key: string]: string | string[] | undefined;
    }>;
}

export default async function DataSetPage({ params, searchParams }: PageProps) {
    const [resolvedParams, resolvedSearchParams] = await Promise.all([
        params,
        searchParams
    ]);

    console.log('resolvedParams:', resolvedParams);

    try {
        return (
            <FlashcardComponent dataSetId={resolvedParams.id}/>
        );
    } catch (error) {
        console.error('Error fetching data set:', error);
        notFound();
    }
}
