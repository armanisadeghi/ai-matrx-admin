/*
// components/matrx/Entity/prewired-components/layouts/EntitySmartLayout.tsx
'use client';

import React, {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {CardContent} from '@/components/ui/card';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {Button} from '@/components/ui/button';
import {ArrowLeft,} from 'lucide-react';
import {cn} from '@/lib/utils';
import SplitLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/SplitLayout";
import SideBySideLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/SideBySideLayout";
import StackedLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/StackedLayout";
import EnhancedCard from "@/components/matrx/Entity/prewired-components/layouts/parts/EnhancedCard";
import {containerVariants, densityConfig} from "@/config/ui/entity-layout-config";
import {
    UnifiedLayoutProps,
} from './types';
import {ENTITY_QUICK_REFERENCE} from "@/components/matrx/Entity/prewired-components/quick-reference";


interface EntitySmartLayoutProps extends UnifiedLayoutProps {
    className?: string;
}

const EntitySmartLayoutCombined: React.FC<EntitySmartLayoutProps> = (
    layoutState,
    handlers,
    quickReferenceComponentName,
    dynamicStyleOptions,
    dynamicLayoutOptions,
    formStyleOptions,
    className,
) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [error, setError] = useState<EntityError | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const [selectHeight, setSelectHeight] = useState<number>(0);
    const rightColumnRef = useRef<HTMLDivElement>(null);

    const formLayoutType = dynamicLayoutOptions?.formLayout || 'stacked';
    const density = dynamicStyleOptions?.density || 'normal';
    const animationPreset = dynamicStyleOptions?.animationPreset || 'subtle';

    useEffect(() => {
        if (formLayoutType && rightColumnRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSelectHeight(entry.contentRect.height);
                }
            });

            observer.observe(rightColumnRef.current);
            return () => observer.disconnect();
        }
    }, [formLayoutType, selectedEntity]);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
        setHasSelection(false);
        setRecordLabel('Select Record');
    };

    const handleRecordLoad = (record: EntityData<EntityKeys>) => {
        setHasSelection(true);
    };

    const handleError = (error: EntityError) => {
        setError(error);
    };

    const handleRecordLabelChange = (label: string) => {
        setRecordLabel(label);
    };

    const onCreateEntityClick = () => {
        console.log('Create new entity clicked');
    };

    const QuickReferenceComponent = React.useMemo(() => {
        if (!selectedEntity) return null;

        const commonProps = {
            entityKey: selectedEntity,
            className: 'w-full',
            density: dynamicStyleOptions?.density || 'normal',
            animationPreset: dynamicStyleOptions?.animationPreset || 'subtle',
        };

        const components = {
            cards: <ENTITY_QUICK_REFERENCE.CARDS {...commonProps} showCreateNewButton
                                                 onCreateEntityClick={onCreateEntityClick}/>,
            cardsEnhanced: <ENTITY_QUICK_REFERENCE.CARDS_ENHANCED {...commonProps} showCreateNewButton
                                                                  showMultiSelectButton
                                                                  onCreateEntityClick={onCreateEntityClick}/>,
            accordion: <ENTITY_QUICK_REFERENCE.ACCORDION {...commonProps} />,
            accordionEnhanced: <ENTITY_QUICK_REFERENCE.ACCORDION_ENHANCED {...commonProps} />,
            list: <ENTITY_QUICK_REFERENCE.LIST {...commonProps} />,
            select: <ENTITY_QUICK_REFERENCE.SELECT {...commonProps} onRecordLoad={handleRecordLoad}
                                                   onError={handleError} onLabelChange={handleRecordLabelChange}/>,
        };
        return components[quickReferenceComponentName || 'list'];
    }, [selectedEntity, quickReferenceComponentName, dynamicStyleOptions?.density, dynamicStyleOptions?.animationPreset]);

    const layoutProps: UnifiedLayoutProps = {
        layoutState: {
            selectedEntity,
            isExpanded,
            rightColumnRef,
            selectHeight
        },
        handlers: {
            setIsExpanded,
            handleEntityChange,
            onCreateEntityClick,
        },
        QuickReferenceComponent,
        dynamicStyleOptions: dynamicStyleOptions,
        dynamicLayoutOptions: dynamicLayoutOptions,
    };

    const layouts = {
        split: <SplitLayout unifiedLayoutProps={layoutProps}/>,
        sideBySide: <SideBySideLayout unifiedLayoutProps={layoutProps}/>,
        stacked: <StackedLayout unifiedLayoutProps={layoutProps}/>
    };

    return (
        <div className={cn(
            'w-full h-full relative overflow-hidden',
            densityConfig[density].spacing,
            className
        )}>
            <AnimatePresence mode="sync">
                <motion.div
                    className="h-full"
                    variants={containerVariants[animationPreset]}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    {layouts[formLayoutType]}
                </motion.div>
            </AnimatePresence>

            <AnimatePresence>
                {error && (
                    <motion.div
                        className="fixed bottom-4 right-4 z-50"
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: 20}}
                    >
                        <EnhancedCard className="bg-destructive text-destructive-foreground">
                            <CardContent className="flex items-center gap-2">
                                <p>{error.message}</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setError(null)}
                                    className="text-destructive-foreground"
                                >
                                    <ArrowLeft className={densityConfig[density].iconSize}/>
                                </Button>
                            </CardContent>
                        </EnhancedCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EntitySmartLayoutCombined;
*/
