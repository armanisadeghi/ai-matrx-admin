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
        filteredFields,
        renderField,
        density,
        densityStyles,
        getGridColumns
    }) => {
    const sections = [...new Set(filteredFields.map(field => field.componentProps.section || 'Default'))];
    return (
        <div className={densityStyles.container}>
            {sections.map(section => (
                <div key={section} className={cn("border-b", densityStyles.padding)}>
                    <h3 className={cn(
                        "font-semibold mb-4",
                        densityConfig[density].fontSize
                    )}>{section}</h3>
                    <div className={cn(
                        "grid",
                        densityConfig[density].spacing,
                        getGridColumns()
                    )}>
                        {filteredFields
                            .filter(field => (field.componentProps.section || 'Default') === section)
                            .map(field => (
                                <div
                                    key={`${section}-${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}>
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
        filteredFields,
        renderField,
        density,
        densityStyles,
        getGridColumns
    }) => {
    const sections = [...new Set(filteredFields.map(field => field.componentProps.section || 'Default'))];
    return (
        <Accordion type="single" collapsible className={cn("w-full", densityStyles.container)}>
            {sections.map(section => (
                <AccordionItem key={section} value={section}>
                    <AccordionTrigger className={densityConfig[density].fontSize}>
                        {section}
                    </AccordionTrigger>
                    <AccordionContent className={densityStyles.padding}>
                        <div className={cn(
                            "grid",
                            densityConfig[density].spacing,
                            getGridColumns()
                        )}>
                            {filteredFields
                                .filter(field => (field.componentProps.section || 'Default') === section)
                                .map(field => (
                                    <div
                                        key={`${section}-${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}>
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
    const sections = [...new Set(filteredFields.map(field => field.componentProps.section || 'Default'))];
    return (
        <Tabs defaultValue={sections[0]} className={cn("w-full", densityStyles.container)}>
            <TabsList className={densityConfig[density].fontSize}>
                {sections.map(section => (
                    <TabsTrigger key={section} value={section}>
                        {section}
                    </TabsTrigger>
                ))}
            </TabsList>
            {sections.map(section => (
                <TabsContent key={section} value={section} className={densityStyles.padding}>
                    <div className={cn("grid", densityConfig[density].spacing, getGridColumns())}>
                        {filteredFields
                            .filter(field => (field.componentProps.section || 'Default') === section)
                            .map(field => (
                                <div
                                    key={`${section}-${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}>
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
            <div key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}
                 className={cn("flex", densityStyles.padding)}>
                <div className={cn(
                    "flex-shrink-0 rounded-full bg-primary",
                    "flex items-center justify-center text-primary-foreground",
                    densityConfig[density].iconSize
                )}>
                    {index + 1}
                </div>
                <div className={cn("flex-grow", densityStyles.padding)}>
                    {renderField(field)}
                </div>
            </div>
        ))}
    </div>
);


