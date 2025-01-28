import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DataItem from '@/components/ui/matrx/DataItem';
import DataChangeCounterEnhanced from '@/components/ui/matrx/DataChangeCounterEnhanced';
import { EntityKeys } from '@/types';

interface EntityDebugCardProps {
    title: string;
    entity: EntityKeys;
    ids: any;
    matrxIds: any;
    records: any;
}

export const EntityDebugCard = ({ title, entity, ids, matrxIds, records }: EntityDebugCardProps) => (
    <Card>
        <CardHeader>
            <CardTitle>
                {title}: {entity}
            </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
            <DataChangeCounterEnhanced
                className='w-full'
                label='Record Changes'
                data={records}
            />
            <DataItem
                label='Ids'
                value={ids}
            />
            <DataItem
                label='Matrx Ids'
                value={matrxIds}
            />
            <DataItem
                label='Records'
                value={records}
            />
        </CardContent>
    </Card>
);
