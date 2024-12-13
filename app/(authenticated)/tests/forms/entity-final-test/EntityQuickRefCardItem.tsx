// components/EntityReferenceCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Grid2X2 } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';

interface EntityQuickRefCardItemProps {
    recordKey: string;
    displayValue: string;
    isSelected: boolean;
    onSelect: (recordKey: string) => void;
}

const EntityQuickRefCardItem = memo(function EntityQuickRefCardItem({
    recordKey,
    displayValue,
    isSelected,
    onSelect
}: EntityQuickRefCardItemProps) {
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
