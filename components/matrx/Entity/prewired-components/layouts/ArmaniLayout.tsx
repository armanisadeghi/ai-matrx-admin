// EntityLayout.tsx
import React, {useState, useRef, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {CardContent} from '@/components/ui/card';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityError} from '@/lib/redux/entity/types';
import {Button} from '@/components/ui/button';
import {ArrowLeft,} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
    EntityQuickReferenceAccordionEnhanced,
    EntityQuickReferenceCardsEnhanced,
    EntityQuickReferenceList,
    EntityQuickReferenceSelect
} from '../quick-reference';
import {
    cardVariants, containerVariants,
    densityConfig, getAnimationVariants, layoutTransitions
} from "@/config/ui/entity-layout-config";
import {
    AnimationPreset,
    animationPresetOptions,
    ComponentDensity,
    ComponentSize, componentSizeOptions,
    densityOptions,
    formColumnOptions,
    FormColumnsOptions,
    formDirectionOptions,
    FormDirectionOptions,
    formLayoutOptions,
    FormLayoutOptions,
    inlineEntityColumnOptions,
    InlineEntityColumnsOptions, InlineEntityComponentStyles,
    inlineEntityStyleOptions,
    pageLayoutOptions,
    PageLayoutOptions,
    QuickReferenceComponentType,
    textSizeOptions,
    TextSizeOptions,
} from '@/types/componentConfigTypes';
import SplitLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/SplitLayout";
import SideBySideLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/SideBySideLayout";
import StackedLayout from "@/components/matrx/Entity/prewired-components/layouts/parts/StackedLayout";
import EnhancedCard from "@/components/matrx/Entity/prewired-components/layouts/parts/EnhancedCard";


export interface ArmaniLayoutProps {
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    layoutVariant?: PageLayoutOptions;
    size?: ComponentSize;
    splitRatio?: number;
    quickReferenceType?: QuickReferenceComponentType;
    formOptions?: {
        size?: ComponentSize;
        formLayout?: FormLayoutOptions;
        formColumns?: FormColumnsOptions;
        formDirection?: FormDirectionOptions;
        formEnableSearch?: boolean;
        formIsSinglePage?: boolean;
        formIsFullPage?: boolean;
        floatingLabel?: boolean;
        showLabel?: boolean;
        textSize?: TextSizeOptions;
        inlineEntityOptions?: {
            showInlineEntities: boolean;
            inlineEntityStyle: InlineEntityComponentStyles;
            inlineEntityColumns: InlineEntityColumnsOptions;
            editableInlineEntities: boolean;
        };
    };
}

const ArmaniLayout: React.FC<ArmaniLayoutProps> = (
    {
        className,
        density = 'normal',
        animationPreset = 'smooth',
        layoutVariant = 'split',
        splitRatio = 25,
        quickReferenceType = 'cardsEnhanced',
        formOptions
    }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [error, setError] = useState<EntityError | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const [selectHeight, setSelectHeight] = useState<number>(0);
    const rightColumnRef = useRef<HTMLDivElement>(null);
    const [floatingLabel, setFloatingLabel] = useState(false);

    useEffect(() => {
        if (layoutVariant !== 'stacked' && rightColumnRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSelectHeight(entry.contentRect.height);
                }
            });

            observer.observe(rightColumnRef.current);
            return () => observer.disconnect();
        }
    }, [layoutVariant, selectedEntity]);

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

    const layoutProps = {
        selectedEntity,
        isExpanded,
        setIsExpanded,
        handleEntityChange,
        QuickReferenceComponent,
        rightColumnRef,
        selectHeight,
        density,
        animationPreset,
        formOptions,
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
                    {layouts[layoutVariant]}
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

export default ArmaniLayout;
