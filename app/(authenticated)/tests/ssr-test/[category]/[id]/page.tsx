// app/(authenticated)/tests/ssr-test/[category]/[id]/page.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getDataByDataSetName } from '../../constants';
import { notFound } from 'next/navigation';

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

    console.log('Data Set Page Params:', resolvedParams);
    console.log('Data Set Search Params:', resolvedSearchParams);

    try {
        const dataSet = await getDataByDataSetName(resolvedParams.id);
        console.log('Retrieved Data Set:', dataSet);

        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        Data Set: {resolvedSearchParams.optionName || resolvedParams.id}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                        {JSON.stringify(dataSet, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        );
    } catch (error) {
        console.error('Error fetching data set:', error);
        notFound();
    }
}
