import React from "react";
import {motion, AnimatePresence} from "framer-motion";
import {cn} from "@/styles/themes/utils";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    cardVariants, containerVariants,
    densityConfig,
    getAnimationVariants,
    spacingConfig,
} from "@/config/ui/entity-layout-config";
import {EntityStateField} from "@/lib/redux/entity/types";
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";
import {KeyIcon} from "lucide-react";


export interface ArmaniFormLayoutProps {
    filteredFields: EntityStateField[];
    renderField: (field: EntityStateField) => JSX.Element;
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
        renderField,
        containerSpacing,
        getGridColumns,
        getFlexDirection,
        animationPreset,
        containerVariants,
        cardVariants
    }) => (
    <div className={cn("grid", containerSpacing, getGridColumns(), getFlexDirection())}>
        <AnimatePresence>
            {filteredFields.map((field) => (
                <motion.div
                    key={`${field.uniqueFieldId}-${field.name}`}
                    className={cn(
                        field.isNative ? "" : "col-span-full",
                        field.isNative ? "" : `bg-card ${containerSpacing} rounded-lg shadow-sm`
                    )}
                    variants={cardVariants[animationPreset]}
                    initial={containerVariants[animationPreset].initial}
                    animate={containerVariants[animationPreset].animate}
                    exit={containerVariants[animationPreset].exit}
                    transition={containerVariants[animationPreset].transition}
                >
                    {renderField(field)}
                </motion.div>
            ))}
        </AnimatePresence>
    </div>
);


export const SectionsLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields = [],
        renderField,
        density,
        densityStyles,
        getGridColumns,
    }) => {
    const sections = [
        ...new Set(
            (filteredFields || []).map(
                (field) => field.componentProps?.section || 'Default'
            )
        ),
    ];

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
                        {(filteredFields || [])
                            .filter(
                                (field) =>
                                    (field.componentProps?.section || 'Default') ===
                                    section
                            )
                            .map((field) => (
                                <div key={`${section}-${field.uniqueFieldId}`}>
                                    {renderField(field)}
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
        renderField,
        density,
        densityStyles,
        getGridColumns,
    }) => {
    // Extract unique sections or default to 'Default'
    const sections = [
        ...new Set(
            (filteredFields || []).map(
                (field) => field.componentProps?.section || 'Default'
            )
        ),
    ];

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
                            {(filteredFields || [])
                                .filter(
                                    (field) =>
                                        (field.componentProps?.section || 'Default') ===
                                        section
                                )
                                .map((field) => (
                                    <div key={`${section}-${field.uniqueFieldId}`}>
                                        {renderField(field)}
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
        renderField,
        density,
        densityStyles,
        getGridColumns
    }) => {
    const sections = [
        ...new Set(
            (filteredFields || []).map(
                (field) => field.componentProps?.section || 'Default'
            )
        ),
    ];
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
                        {(filteredFields || [])
                            .filter(
                                (field) =>
                                    (field.componentProps?.section || 'Default') ===
                                    section
                            )
                            .map((field) => (
                                <div key={`${section}-${field.uniqueFieldId}`}>
                                    {renderField(field)}
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
        renderField,
        density,
        densityStyles,
        getFlexDirection
    }) => (
    <div className={cn(
        "columns-1 sm:columns-2 lg:columns-3 xl:columns-4",
        densityConfig[density].spacing,
        getFlexDirection()
    )}>
        {filteredFields.map((field) => (
            <div key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}
                 className={cn("break-inside-avoid", densityStyles.padding)}>
                {renderField(field)}
            </div>
        ))}
    </div>
);

export const CarouselLayout: React.FC<ArmaniFormLayoutProps & {
    carouselActiveIndex: number;
    setCarouselActiveIndex: (index: number) => void
}> = ({
          filteredFields,
          renderField,
          density,
          densityStyles,
          getFlexDirection,
          carouselActiveIndex,
          setCarouselActiveIndex
      }) => (
    <div className="relative overflow-hidden">
        <div className={cn(
            "flex transition-transform duration-300 ease-in-out",
            densityConfig[density].spacing,
            getFlexDirection()
        )}
             style={{transform: `translateX(-${carouselActiveIndex * 100}%)`}}>
            {filteredFields.map((field) => (
                <div key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}
                     className={cn("w-full flex-shrink-0", densityStyles.padding)}>
                    {renderField(field)}
                </div>
            ))}
        </div>
        <button
            onClick={() => setCarouselActiveIndex(Math.max(carouselActiveIndex - 1, 0))}
            className={cn(
                "absolute left-0 top-1/2 transform -translate-y-1/2",
                "bg-primary text-primary-foreground rounded-full",
                densityStyles.padding
            )}
        >
            &lt;
        </button>
        <button
            onClick={() => setCarouselActiveIndex(Math.min(carouselActiveIndex + 1, filteredFields.length - 1))}
            className={cn(
                "absolute right-0 top-1/2 transform -translate-y-1/2",
                "bg-primary text-primary-foreground rounded-full",
                densityStyles.padding
            )}
        >
            &gt;
        </button>
    </div>
);

export const TimelineLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        renderField,
        density,
        densityStyles,
        getFlexDirection
    }) => (
    <div className={cn("relative", densityStyles.container, getFlexDirection())}>
        {filteredFields.map((field, index) => (
            <div
                key={`${field.uniqueFieldId}-timeline-${index}`}
                className="flex flex-col p-0"
            >
                <div className="flex items-center p-0 gap-0">
                    <div className={cn(
                        "flex-shrink-0 rounded-full bg-primary p-0 mb-0",
                        "flex items-center justify-center text-primary-foreground",
                        densityConfig[density].iconSize
                    )}>
                        {index + 1}
                    </div>
                    <span className="ml-2 mt-0">{field.displayName}</span>
                </div>
                <div className={densityStyles.padding}>
                    {renderField(field)}
                </div>
            </div>
        ))}
    </div>
);

export const TrialStackedLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        renderField,
        densityStyles,
        getFlexDirection,
    }) => (
    <div className={cn("flex flex-col", densityStyles.container, getFlexDirection())}>
        {filteredFields.map((field) => (
            <div key={field.uniqueFieldId} className={densityStyles.padding}>
                {renderField(field)}
            </div>
        ))}
    </div>
);

export const ZigzagLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        renderField,
        densityStyles,
    }) => (
    <div className={cn("space-y-8", densityStyles.container)}>
        {filteredFields.map((field, index) => (
            <div
                key={field.uniqueFieldId}
                className={cn(
                    "flex",
                    index % 2 === 0 ? "flex-row" : "flex-row-reverse",
                    densityStyles.padding
                )}
            >
                <div className="flex-grow">{renderField(field)}</div>
            </div>
        ))}
    </div>
);

export const TrialCardListLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        renderField,
        densityStyles,
    }) => (
    <div className={cn("space-y-4", densityStyles.container)}>
        {filteredFields.map((field) => (
            <div
                key={field.uniqueFieldId}
                className={cn("rounded-lg shadow-md p-4 bg-card", densityStyles.padding)}
            >
                {renderField(field)}
            </div>
        ))}
    </div>
);

export const TrialSplitLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        renderField,
        densityStyles,
    }) => {
    const middleIndex = Math.ceil(filteredFields.length / 2);
    const leftFields = filteredFields.slice(0, middleIndex);
    const rightFields = filteredFields.slice(middleIndex);

    return (
        <div className={cn("grid grid-cols-2 gap-4", densityStyles.container)}>
            <div className="space-y-4">
                {leftFields.map((field) => (
                    <div key={field.uniqueFieldId}>{renderField(field)}</div>
                ))}
            </div>
            <div className="space-y-4">
                {rightFields.map((field) => (
                    <div key={field.uniqueFieldId}>{renderField(field)}</div>
                ))}
            </div>
        </div>
    );
};

export const TrialListGroupLayout: React.FC<ArmaniFormLayoutProps> = (
    {
        filteredFields,
        renderField,
        densityStyles,
    }) => {
    const groups = filteredFields.reduce((acc, field) => {
        const group = field.componentProps?.group || "Ungrouped";
        if (!acc[group]) acc[group] = [];
        acc[group].push(field);
        return acc;
    }, {} as Record<string, EntityStateField[]>);

    return (
        <div className={densityStyles.container}>
            {Object.entries(groups).map(([group, fields]) => (
                <div key={group} className="mb-8">
                    <h4 className="text-lg font-bold mb-4">{group}</h4>
                    <div className="space-y-4">
                        {fields.map((field) => (
                            <div key={field.uniqueFieldId}>{renderField(field)}</div>
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
        renderField,
        densityStyles,
    }) => (
    <div className={cn("relative", densityStyles.container)}>
        {filteredFields.map((field, index) => (
            <div
                key={field.uniqueFieldId}
                className={cn("absolute", `top-${index * 20} left-${index * 20}`)}
            >
                {renderField(field)}
            </div>
        ))}
    </div>
);

export const TrialFieldTabsLayout: React.FC<ArmaniFormLayoutProps> = ({
                                                                          filteredFields,
                                                                          renderField,
                                                                          density,
                                                                          densityStyles,
                                                                      }) => {
    const getTabLabel = (field: any) => {
        const label = field.isNative ? field.displayName : field.entityName;
        return (
            <div className="flex items-center gap-2">
                {field.isPrimaryKey && (
                    <KeyIcon className="h-3 w-3"/>
                )}
                <span>{label}</span>
            </div>
        );
    };

    return (
        <Tabs
            key={`tabs-container-${filteredFields?.[0]?.uniqueFieldId}`}
            defaultValue={filteredFields?.[0]?.uniqueFieldId}
            className={cn('w-full', densityStyles.container)}
        >
            <TabsList
                key={`tablist-${filteredFields?.[0]?.uniqueFieldId}`}
                className={cn(
                    'flex h-auto flex-wrap justify-start gap-1 bg-muted/50 p-1',
                    densityConfig[density]?.fontSize
                )}
            >
                {(filteredFields || []).map((field) => (
                    <TabsTrigger
                        key={`tab-${field.uniqueFieldId}`}
                        value={field.uniqueFieldId}
                        className={cn(
                            'data-[state=active]:bg-background',
                            'data-[state=active]:shadow-sm',
                            'transition-all duration-200',
                            'hover:bg-secondary',
                            'rounded-md px-3 py-1.5',
                            'border border-transparent',
                            'hover:border-border',
                            field.isRequired && 'text-primary font-medium',
                            field.isPrimaryKey && 'font-semibold'
                        )}
                    >
                        {getTabLabel(field)}
                    </TabsTrigger>
                ))}
            </TabsList>

            {(filteredFields || []).map((field) => (
                <TabsContent
                    key={`content-${field.uniqueFieldId}`}
                    value={field.uniqueFieldId}
                    className={cn(
                        densityStyles.padding,
                        'border-none p-4 outline-none'
                    )}
                >
                    <div
                        key={`field-wrapper-${field.uniqueFieldId}`}
                        className={cn('w-full', densityConfig[density]?.spacing)}
                    >
                        {renderField(field)}
                    </div>
                </TabsContent>
            ))}
        </Tabs>
    );
};
