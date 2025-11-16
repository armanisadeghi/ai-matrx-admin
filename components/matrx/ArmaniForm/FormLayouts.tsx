import React from "react";
import {motion, AnimatePresence} from "motion/react";
import {cn} from "@/styles/themes/utils";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    cardVariants, containerVariants,
    densityConfig,
    getAnimationVariants,
    spacingConfig,
} from "@/config/ui/entity-layout-config";
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";
import {KeyIcon} from "lucide-react";

export interface ArmaniFormLayoutProps {
    filteredFields: React.ReactNode[];
    renderField?: null; // Keep for backwards compatibility but not used
    density: ComponentDensity;
    densityStyles: any;
    containerSpacing?: string;
    getGridColumns: () => string;
    getFlexDirection: () => string;
    animationPreset?: AnimationPreset;
    containerVariants?: any;
    cardVariants?: any;
}

// Layout Components
export const GridLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        containerSpacing,
        getGridColumns,
        getFlexDirection,
        animationPreset,
        containerVariants,
        cardVariants
    }) => (
    <div className={cn("grid", containerSpacing, getGridColumns(), getFlexDirection())}>
        <AnimatePresence>
            {filteredFields.map((field, index) => (
                <motion.div
                    key={`field-${index}`}
                    variants={cardVariants[animationPreset]}
                    initial={containerVariants[animationPreset].initial}
                    animate={containerVariants[animationPreset].animate}
                    exit={containerVariants[animationPreset].exit}
                    transition={containerVariants[animationPreset].transition}
                >
                    {field}
                </motion.div>
            ))}
        </AnimatePresence>
    </div>
);

export const SectionsLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields = [],
        density,
        densityStyles,
        getGridColumns,
    }) => {
    // For sections layout, we'll group fields into a default section
    // In the future, this could be enhanced to support actual field sectioning
    const sections = ['Default'];

    return (
        <div className={densityStyles.container}>
            {sections.map((section) => (
                <div
                    key={section}
                    className={cn('border-b', densityStyles.padding)}
                >
                    <h3
                        className={cn(
                            'font-semibold mb-4',
                            densityConfig[density]?.fontSize
                        )}
                    >
                        {section}
                    </h3>
                    <div
                        className={cn(
                            'grid',
                            densityConfig[density]?.spacing,
                            getGridColumns()
                        )}
                    >
                        {filteredFields.map((field, index) => (
                            <div key={`${section}-${index}`}>
                                {field}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const AccordionLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields = [],
        density,
        densityStyles,
        getGridColumns,
    }) => {
    // For accordion layout, we'll group fields into a default section
    const sections = ['Default'];

    return (
        <Accordion
            type="single"
            collapsible
            className={cn('w-full', densityStyles.container)}
        >
            {sections.map((section) => (
                <AccordionItem key={section} value={section}>
                    <AccordionTrigger className={densityConfig[density]?.fontSize}>
                        {section}
                    </AccordionTrigger>
                    <AccordionContent className={densityStyles.padding}>
                        <div
                            className={cn(
                                'grid',
                                densityConfig[density]?.spacing,
                                getGridColumns()
                            )}
                        >
                            {filteredFields.map((field, index) => (
                                <div key={`${section}-${index}`}>
                                    {field}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
};

export const TabsLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        density,
        densityStyles,
        getGridColumns
    }) => {
    const sections = ['Default'];
    
    return (
        <Tabs
            defaultValue={sections[0] || 'Default'}
            className={cn('w-full', densityStyles.container)}
        >
            <TabsList className={densityConfig[density]?.fontSize}>
                {sections.map((section) => (
                    <TabsTrigger key={section} value={section}>
                        {section}
                    </TabsTrigger>
                ))}
            </TabsList>
            {sections.map((section) => (
                <TabsContent
                    key={section}
                    value={section}
                    className={densityStyles.padding}
                >
                    <div
                        className={cn(
                            'grid',
                            densityConfig[density]?.spacing,
                            getGridColumns()
                        )}
                    >
                        {filteredFields.map((field, index) => (
                            <div key={`${section}-${index}`}>
                                {field}
                            </div>
                        ))}
                    </div>
                </TabsContent>
            ))}
        </Tabs>
    );
};

export const MasonryLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        density,
        densityStyles,
        getFlexDirection
    }) => (
    <div className={cn('columns-1 md:columns-2 lg:columns-3 gap-6', densityStyles.container)}>
        {filteredFields.map((field, index) => (
            <div key={`masonry-${index}`} className={cn('break-inside-avoid mb-6', densityStyles.gap)}>
                {field}
            </div>
        ))}
    </div>
);

export const CarouselLayout: React.FC<ArmaniFormLayoutProps & {
    carouselActiveIndex: number;
    setCarouselActiveIndex: (index: number) => void
}> = ({
          filteredFields,
          density,
          densityStyles,
          getFlexDirection,
          carouselActiveIndex,
          setCarouselActiveIndex
      }) => (
    <div className={cn('relative', densityStyles.container)}>
        <div className={cn('overflow-hidden', densityStyles.section)}>
            <div
                className={cn('flex transition-transform duration-300', getFlexDirection())}
                style={{
                    transform: `translateX(-${carouselActiveIndex * 100}%)`,
                }}
            >
                {filteredFields.map((field, index) => (
                    <div key={`carousel-${index}`} className={cn('w-full flex-shrink-0', densityStyles.gap)}>
                        {field}
                    </div>
                ))}
            </div>
        </div>
        
        <div className={cn('flex justify-center mt-4', densityStyles.gap)}>
            {filteredFields.map((_, index) => (
                <button
                    key={`dot-${index}`}
                    className={cn(
                        'w-2 h-2 rounded-full mx-1',
                        index === carouselActiveIndex 
                            ? 'bg-primary' 
                            : 'bg-muted-foreground/30'
                    )}
                    onClick={() => setCarouselActiveIndex(index)}
                />
            ))}
        </div>
    </div>
);

export const TimelineLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        density,
        densityStyles,
        getFlexDirection
    }) => (
    <div className={cn('relative', densityStyles.container)}>
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
        <div className={cn('space-y-6', densityStyles.gap)}>
            {filteredFields.map((field, index) => (
                <div key={`timeline-${index}`} className="relative flex items-start">
                    <div className="absolute left-4 w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 mt-1.5"></div>
                    <div className="ml-10 flex-1">
                        {field}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const TrialStackedLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        densityStyles,
        getFlexDirection,
    }) => (
    <div className={cn('space-y-4', densityStyles.container)}>
        {filteredFields.map((field, index) => (
            <div key={`stacked-${index}`} className={cn('w-full', densityStyles.gap)}>
                {field}
            </div>
        ))}
    </div>
);

export const ZigzagLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        densityStyles,
    }) => (
    <div className={cn('space-y-6', densityStyles.container)}>
        {filteredFields.map((field, index) => (
            <div
                key={`zigzag-${index}`}
                className={cn(
                    'flex w-full',
                    index % 2 === 0 ? 'justify-start' : 'justify-end',
                    densityStyles.gap
                )}
            >
                <div className="w-4/5">
                    {field}
                </div>
            </div>
        ))}
    </div>
);

export const TrialCardListLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        densityStyles,
    }) => (
    <div className={cn('space-y-4', densityStyles.container)}>
        {filteredFields.map((field, index) => (
            <div key={`card-${index}`} className={cn('bg-card p-4 rounded-lg shadow-sm border', densityStyles.gap)}>
                {field}
            </div>
        ))}
    </div>
);

export const TrialSplitLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        densityStyles,
    }) => {
    const midpoint = Math.ceil(filteredFields.length / 2);
    const leftFields = filteredFields.slice(0, midpoint);
    const rightFields = filteredFields.slice(midpoint);

    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', densityStyles.container)}>
            <div className={cn('space-y-4', densityStyles.gap)}>
                {leftFields.map((field, index) => (
                    <div key={`left-${index}`}>
                        {field}
                    </div>
                ))}
            </div>
            <div className={cn('space-y-4', densityStyles.gap)}>
                {rightFields.map((field, index) => (
                    <div key={`right-${index}`}>
                        {field}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const TrialListGroupLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        densityStyles,
    }) => {
    const groupSize = 3;
    const groups = [];
    for (let i = 0; i < filteredFields.length; i += groupSize) {
        groups.push(filteredFields.slice(i, i + groupSize));
    }

    return (
        <div className={cn('space-y-6', densityStyles.container)}>
            {groups.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className={cn('bg-muted/20 p-4 rounded-lg', densityStyles.gap)}>
                    <h4 className="font-medium mb-3">Group {groupIndex + 1}</h4>
                    <div className="space-y-3">
                        {group.map((field, fieldIndex) => (
                            <div key={`group-${groupIndex}-field-${fieldIndex}`}>
                                {field}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const TrialFloatingLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        densityStyles,
    }) => (
    <div className={cn('relative min-h-96', densityStyles.container)}>
        {filteredFields.map((field, index) => (
            <div
                key={`floating-${index}`}
                className={cn('absolute', densityStyles.gap)}
                style={{
                    left: `${(index * 50) % 300}px`,
                    top: `${(index * 80) % 200}px`,
                    zIndex: filteredFields.length - index,
                }}
            >
                {field}
            </div>
        ))}
    </div>
);

export const TrialFieldTabsLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        density,
        densityStyles,
    }) => {
    return (
        <Tabs defaultValue="field-0" className={cn('w-full', densityStyles.container)}>
            <TabsList className={cn('grid w-full', `grid-cols-${Math.min(filteredFields.length, 4)}`, densityConfig[density]?.fontSize)}>
                {filteredFields.map((_, index) => (
                    <TabsTrigger key={`tab-${index}`} value={`field-${index}`}>
                        Field {index + 1}
                    </TabsTrigger>
                ))}
            </TabsList>
            {filteredFields.map((field, index) => (
                <TabsContent key={`content-${index}`} value={`field-${index}`} className={densityStyles.padding}>
                    {field}
                </TabsContent>
            ))}
        </Tabs>
    );
};
