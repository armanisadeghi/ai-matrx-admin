import React from 'react';

import {motion} from 'framer-motion';
import {Card, CardContent} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {ComponentDensity, AnimationPreset, ComponentSize} from '@/types/componentConfigTypes';
import {EntityKeys} from "@/types/entityTypes";
import EntitySelection from '../../entity-management/EntitySelection';
import {
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../../quick-reference';
import {ScrollArea} from "@/components/ui";
import {LayoutHeader} from "@/components/matrx/Entity/prewired-components/layouts/layout-sections/extras";
import {densityConfig} from "@/config/ui/entity-layout-config";



interface EnhancedCardProps {
    children: React.ReactNode;
    className?: string;
    variants?: any;
    noAnimation?: boolean;
    cardRef?: React.RefObject<HTMLDivElement>;
    density: ComponentDensity;
    size: ComponentSize;
    animationPreset: AnimationPreset;
}




export const EnhancedCard = React.memo((
    {
        children,
        className,
        variants,
        noAnimation,
        cardRef,
        density,
        size,
        animationPreset
    }: EnhancedCardProps) => {
    const cardVariants = {
        none: {},
        subtle: {
            initial: {opacity: 0},
            animate: {opacity: 1},
            transition: {duration: 0.2}
        },
        smooth: {
            initial: {opacity: 0, y: 20},
            animate: {opacity: 1, y: 0},
            transition: {duration: 0.3}
        },
        energetic: {
            initial: {opacity: 0, scale: 0.95, y: 20},
            animate: {opacity: 1, scale: 1, y: 0},
            transition: {type: 'spring', stiffness: 300, damping: 25}
        },
        playful: {
            initial: {opacity: 0, scale: 0.9, rotate: -2},
            animate: {opacity: 1, scale: 1, rotate: 0},
            transition: {type: 'spring', stiffness: 200, damping: 20}
        }
    };

    const densityConfig = { // Todo: Is this the right one?
        compact: {
            spacing: 'gap-2',
            padding: {
                xs: 'p-2',
                sm: 'p-3',
                md: 'p-4',
                lg: 'p-5',
                xl: 'p-6'
            },
            fontSize: 'text-sm',
            iconSize: 'h-4 w-4',
            buttonSize: 'size-sm',
            maxHeight: 'max-h-[500px]'
        },
        normal: {
            spacing: 'gap-4',
            padding: {
                xs: 'p-3',
                sm: 'p-4',
                md: 'p-5',
                lg: 'p-6',
                xl: 'p-8'
            },
            fontSize: 'text-base',
            iconSize: 'h-5 w-5',
            buttonSize: 'size-default',
            maxHeight: 'max-h-[600px]'
        },
        comfortable: {
            spacing: 'gap-6',
            padding: {
                xs: 'p-4',
                sm: 'p-6',
                md: 'p-8',
                lg: 'p-10',
                xl: 'p-12'
            },
            fontSize: 'text-lg',
            iconSize: 'h-6 w-6',
            buttonSize: 'size-lg',
            maxHeight: 'max-h-[700px]'
        }
    };

    return (
        <motion.div
            variants={!noAnimation ? variants || cardVariants[animationPreset] : undefined}
            className="w-full"
        >
            <Card
                ref={cardRef}
                className={cn(
                    'relative border shadow-sm',
                    densityConfig[density].padding[size],
                    className
                )}
            >
                {children}
            </Card>
        </motion.div>
    );
});

EnhancedCard.displayName = 'EnhancedCard';



export const EntitySelectionSection = React.memo((
    {
        selectedEntity,
        handleEntityChange,
        density,
        animationPreset,
        selectHeight
    }: {
        selectedEntity: EntityKeys | null;
        handleEntityChange: (value: EntityKeys) => void;
        density: ComponentDensity;
        animationPreset: AnimationPreset;
        selectHeight: number;
    }) => (
    <EnhancedCard
        density={density}
        animationPreset={animationPreset}
        size="md"
    >
        <LayoutHeader
            title="Entity Selection"
            tooltip="Select an entity to begin working"
            density={density}
        />
        <CardContent>
            <EntitySelection
                selectedEntity={selectedEntity}
                onEntityChange={handleEntityChange}
                layout="sideBySide"
                selectHeight={selectHeight}
                density={density}
                animationPreset={animationPreset}
            />
        </CardContent>
    </EnhancedCard>
));

EntitySelectionSection.displayName = 'EntitySelectionSection';


export const QuickReferenceSection = React.memo((
    {
        QuickReferenceComponent,
        density,
        animationPreset,
        cardRef
    }: {
        QuickReferenceComponent: React.ReactNode;
        density: ComponentDensity;
        animationPreset: AnimationPreset;
        cardRef: React.RefObject<HTMLDivElement>;
    }) => (
    <EnhancedCard
        density={density}
        animationPreset={animationPreset}
        size="md"
        cardRef={cardRef}
    >
        <LayoutHeader
            title="Quick Reference"
            tooltip="Quickly select or create records"
            density={density}
        />
        <CardContent className="p-0">
            <ScrollArea className={densityConfig[density].maxHeight}>
                {QuickReferenceComponent}
            </ScrollArea>
        </CardContent>
    </EnhancedCard>
));

QuickReferenceSection.displayName = 'QuickReferenceSection';
