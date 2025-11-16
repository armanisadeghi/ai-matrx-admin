// EnhancedCard.tsx
import React from 'react';
import {motion} from 'motion/react';
import {Card} from '@/components/ui/card';
import {cn} from '@/lib/utils';

interface EnhancedCardProps {
    children: React.ReactNode;
    className?: string;
    variants?: any;
    noAnimation?: boolean;
    cardRef?: React.RefObject<HTMLDivElement>;
    ref?: React.MutableRefObject<HTMLDivElement>;
}

export const EnhancedSmartCard: React.FC<EnhancedCardProps> = (
    {
        children,
        className,
        variants,
        noAnimation,
        cardRef,
        ref
    }) => (
    <motion.div
        variants={!noAnimation ? variants : undefined}
        className="w-full"
    >
        <Card
            ref={cardRef || ref}
            className={cn(
                'relative border bg-card-background shadow-lg mt-2 p-0 m-0',
                className
            )}
        >
            {children}
        </Card>
    </motion.div>
);

EnhancedSmartCard.displayName = 'EnhancedSmartCard';

export default EnhancedSmartCard;
