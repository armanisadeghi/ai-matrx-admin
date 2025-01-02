'use client';

import {Card, CardContent} from '@/components/ui/card';
import {Grid2X2} from 'lucide-react';
import {memo} from 'react';
import {cn} from '@/lib/utils';
import {useAppSelector, useEntityTools} from '@/lib/redux';
import {EntityKeys} from '@/types/entityTypes';

interface EntityQuickRefCardItemProps {
    entityKey: EntityKeys;
    recordKey: string;
    displayValue: string;
    onSelect: (recordKey: string) => void;
}

const EntityQuickRefCardItem = memo(function EntityQuickRefCardItem(
    {
        entityKey,
        recordKey,
        displayValue,
        onSelect
    }: EntityQuickRefCardItemProps) {

    const { selectors } = useEntityTools(entityKey);
    const isSelected = useAppSelector(state => selectors.selectIsRecordSelected(state, recordKey));

    return (
        <Card
            className={cn(
                'relative cursor-pointer p-[0px]',
                isSelected ? 'border border-primary bg-accent' : 'hover:bg-accent/50'
            )}
            onClick={() => onSelect(recordKey)}
        >
            <CardContent className="p-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Grid2X2 className="h-4 w-4 flex-shrink-0 text-muted-foreground"/>
                    <div className="font-medium text-foreground truncate text-sm">
                        {displayValue}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

export default EntityQuickRefCardItem;