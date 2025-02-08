// components/FieldTooltip.tsx
import React from 'react';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { cn } from '@/utils';

interface FieldTooltipProps {
    description: string;
}

const FieldTooltip: React.FC<FieldTooltipProps> = ({ description }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <InfoIcon className={cn(
                    'text-muted-foreground hover:text-foreground transition-colors'
                )} />
            </TooltipTrigger>
            <TooltipContent>
                <p className="text-md mt-8 text-muted-foreground">{description}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export default FieldTooltip;
