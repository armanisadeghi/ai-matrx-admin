// components/matrx/Entity/prewired-components/layouts/EntitySmartLayout.tsx
'use client';

import React, {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {CardContent} from '@/components/ui/card';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types/stateTypes';
import {Button} from '@/components/ui/button';
import {ArrowLeft,} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../quick-reference';
import SplitLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/SplitLayout";
import SideBySideLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/SideBySideLayout";
import StackedLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/StackedLayout";
import EnhancedCard from "@/components/matrx/Entity/prewired-components/layouts/parts/EnhancedCard";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnsOptions, FormDirectionOptions,
    FormLayoutOptions, InlineEntityColumnsOptions, InlineEntityComponentStyles,
    PageLayoutOptions,
    QuickReferenceComponentType, TextSizeOptions
} from "@/types/componentConfigTypes";
import {containerVariants, densityConfig} from "@/config/ui/entity-layout-config";
import {LayoutProps} from "@/types/componentConfigTypes";


export interface FormComponentOptions {
    entitySelectionComponent?: any;
    quickReferenceType?: QuickReferenceComponentType;
    formLayoutType?: PageLayoutOptions;
}

export interface FormStyleOptions {
    splitRatio?: number;
    formLayout?: FormLayoutOptions;
    formColumns?: FormColumnsOptions;
    formDirection?: FormDirectionOptions;
    formEnableSearch?: boolean;
    formIsSinglePage?: boolean;
    formIsFullPage?: boolean;
    floatingLabel?: boolean;
    showLabel?: boolean;
    textSize?: TextSizeOptions;
}

export interface InlineEntityOptions {
    showInlineEntities: boolean;
    inlineEntityStyle: InlineEntityComponentStyles;
    inlineEntityColumns: InlineEntityColumnsOptions;
    editableInlineEntities: boolean;
}

export interface DynamicStyleOptions {
    size?: ComponentSize;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    variant?: MatrxVariant;

}

export interface DynamicLayoutOptions {
    componentOptions?: FormComponentOptions;
    formStyleOptions?: FormStyleOptions;
    inlineEntityOptions?: InlineEntityOptions;
}


interface EntitySmartLayoutProps extends DynamicLayoutOptions {
    dynamicStyleOptions?: DynamicStyleOptions;
    className?: string;
}

const EntitySmartLayoutCombined: React.FC<EntitySmartLayoutProps> = ({
    componentOptions,
    formStyleOptions,
    inlineEntityOptions,
    dynamicStyleOptions,
    className
}) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [error, setError] = useState<EntityError | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const [selectHeight, setSelectHeight] = useState<number>(0);
    const rightColumnRef = useRef<HTMLDivElement>(null);

    // Destructure options for easier access
    const {
        quickReferenceType = 'list',
        formLayoutType = 'split',
        entitySelectionComponent
    } = componentOptions || {};

    const {
        splitRatio = 20,
        formLayout = 'grid',
        formColumns = '2',
        formDirection = 'row',
        formEnableSearch = false,
        formIsSinglePage = true,
        formIsFullPage = true,
        floatingLabel = true,
        showLabel = true,
        textSize = 'md'
    } = formStyleOptions || {};

    const {
        size = 'md',
        density = 'normal',
        animationPreset = 'subtle',
        variant = 'default'
    } = dynamicStyleOptions || {};

    useEffect(() => {
        if (formLayoutType !== 'stacked' && rightColumnRef.current) {
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

    // Get QuickReference component based on type
    const QuickReferenceComponent = React.useMemo(() => {
        if (!selectedEntity) return null;

        const commonProps = {
            entityKey: selectedEntity,
            className: 'w-full',
            density,
            animationPreset,
        };

        const components = {
            cards: <EntityQuickReferenceCardsEnhanced {...commonProps} showCreateNewButton
                                                      onCreateEntityClick={onCreateEntityClick}/>,
            cardsEnhanced: <EntityQuickReferenceCardsEnhanced {...commonProps} showCreateNewButton showMultiSelectButton
                                                              onCreateEntityClick={onCreateEntityClick}/>,
            accordion: <EntityQuickReferenceAccordionEnhanced {...commonProps} />,
            accordionEnhanced: <EntityQuickReferenceAccordionEnhanced {...commonProps} />,
            list: <EntityQuickReferenceList {...commonProps} />,
            select: <EntityQuickReferenceSelect
                {...commonProps}
                onRecordLoad={handleRecordLoad}
                onError={handleError}
                onLabelChange={handleRecordLabelChange}
            />,
        };

        return components[quickReferenceType];
    }, [selectedEntity, quickReferenceType, density, animationPreset]);

    const layoutProps: LayoutProps = {
        selectedEntity,
        isExpanded,
        setIsExpanded,
        handleEntityChange,
        QuickReferenceComponent,
        rightColumnRef,
        selectHeight,
        density,
        animationPreset,
        splitRatio,
        onCreateEntityClick,
        floatingLabel
    };

    const layouts = {
        split: <SplitLayout {...layoutProps} />,
        sideBySide: <SideBySideLayout {...layoutProps} />,
        stacked: <StackedLayout {...layoutProps} />
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
