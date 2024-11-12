// components/matrx/resizable/MatrxPanelHeader.tsx
import React from 'react';
import {Button} from '@/components/ui/button';
import {ArrowLeft} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/badge';

export interface MatrxPanelHeaderProps {
    position: 'left' | 'right' | 'top' | 'bottom';
    title?: React.ReactNode;
    description?: React.ReactNode;
    onBack?: () => void;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    className?: string;
}

const MatrxPanelHeader: React.FC<MatrxPanelHeaderProps> = (
    {
        position,
        title,
        description,
        onBack,
        leading,
        trailing,
        className,
    }) => {
    const isVertical = position === 'top' || position === 'bottom';

    return (
        <div className={cn(
            "flex items-center gap-3",
            isVertical ? "flex-row" : "flex-col",
            className
        )}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {onBack && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="h-6 w-6 p-0 flex-shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4"/>
                    </Button>
                )}
                {leading}
                <div className="truncate">
                    {typeof title === 'string' ? (
                        <h2 className="text-base font-semibold truncate">
                            {title}
                        </h2>
                    ) : title}
                    {description && (
                        <div className="text-xs text-muted-foreground truncate">
                            {description}
                        </div>
                    )}
                </div>
            </div>
            {trailing && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    {trailing}
                </div>
            )}
        </div>
    );
};

export default MatrxPanelHeader;
