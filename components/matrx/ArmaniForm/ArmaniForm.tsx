'use client';

import React, {useState, useRef, useCallback, useMemo} from "react";
import {motion, AnimatePresence} from "framer-motion";
import {cn} from "@/styles/themes/utils";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    EntityButton,
    EntitySearchInput,
} from "./field-components";

import {
    cardVariants, containerVariants,
    densityConfig,
    getAnimationVariants,
    spacingConfig,
} from "@/config/ui/entity-layout-config";
import {ArmaniFormProps, EntityFlexFormField} from "@/components/matrx/Entity/types/entityForm";
import EntityBaseField, {EntityBaseFieldProps} from "./EntityBaseField";
import {useEntity} from "@/lib/redux/entity/useEntity";
import EntityLogger from "@/lib/redux/entity/entityLogger";
import {EntityStateField} from "@/lib/redux/entity/types";

export interface FormState {
    [key: string]: any;
}

export type FormDensity = 'normal' | 'compact' | 'comfortable';
export type AnimationPreset = 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';

const ArmaniForm: React.FC<ArmaniFormProps> = (
    {
        entityKey,
        formData,
        onUpdateField,
        onSubmit,
        onSubmitUpdate,
        onSubmitCreate,
        onSubmitDelete,
        currentStep: externalCurrentStep,
        onNextStep: externalOnNextStep,
        onPrevStep: externalOnPrevStep,
        isSinglePage = false,
        className,
        isFullPage = false,
        columns = 1,
        layout = 'grid',
        enableSearch = false,
        direction = 'row',
        density = 'normal',
        animationPreset = 'smooth',
        size = 'default',
        variant = 'default',
        floatingLabel = true,
        ...props
    }) => {
    const entity = useEntity(entityKey);
    const dynamicFieldInfo = entity?.fieldInfo || [];

    const [internalCurrentStep, setInternalCurrentStep] = useState(0);
    const currentStep = externalCurrentStep !== undefined ? externalCurrentStep : internalCurrentStep;
    const formRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
    const formVariants = getAnimationVariants(animationPreset);
    const containerSpacing = densityConfig[density].spacing;
    const densityStyles = spacingConfig[density];

    const internalOnNextStep = () => {
        setInternalCurrentStep((prevStep) => Math.min(prevStep + 1, dynamicFieldInfo.length - 1));
    };

    const internalOnPrevStep = () => {
        setInternalCurrentStep((prevStep) => Math.max(prevStep - 1, 0));
    };

    const onNextStep = externalOnNextStep || internalOnNextStep;
    const onPrevStep = externalOnPrevStep || internalOnPrevStep;

    const filteredFields = useMemo(() => {
        if (!enableSearch) return dynamicFieldInfo;
        return dynamicFieldInfo.filter(field =>
            field.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            field.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [dynamicFieldInfo, enableSearch, searchTerm]);


    const entityLogger = EntityLogger.createLoggerWithDefaults(`ArmaniForm`, entityKey);

    const createFieldChangeHandler = useCallback((fieldName: string) => {
        return (value: any) => {
            entityLogger.log('info', `Field ${fieldName} changed to:`, value);
            onUpdateField(fieldName, value);
        };
    }, [onUpdateField]);



    const renderField = useCallback((dynamicFieldInfo: EntityStateField) => {
        const fieldName = dynamicFieldInfo.name;
        const fieldValue = formData[fieldName];

        entityLogger.log('debug', `Rendering field ${fieldName} with value:`, fieldValue);

        return (
            <EntityBaseField
                key={`${fieldName}-${dynamicFieldInfo.uniqueFieldId}`}
                entityKey={entityKey}
                dynamicFieldInfo={dynamicFieldInfo}
                value={fieldValue}
                onChange={createFieldChangeHandler(fieldName)}
                density={density}
                animationPreset={animationPreset}
                size={size}
                variant={variant}
                floatingLabel={floatingLabel}
            />
        );
    }, [
        formData,
        entityKey,
        density,
        animationPreset,
        size,
        variant,
        floatingLabel,
        createFieldChangeHandler
    ]);



    const getGridColumns = () => {
        if (typeof columns === 'object') {
            return `grid-cols-${columns.xs} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} xl:grid-cols-${columns.xl}`;
        }
        if (columns === 'auto') {
            return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        }
        switch (columns) {
            case 1:
                return 'grid-cols-1';
            case 2:
                return 'grid-cols-1 sm:grid-cols-2';
            case 3:
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
            case 4:
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
            case 5:
                return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
            case 6:
                return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
            default:
                return 'grid-cols-1';
        }
    };

    const getFlexDirection = () => {
        switch (direction) {
            case 'row':
                return 'flex-row';
            case 'row-reverse':
                return 'flex-row-reverse';
            case 'column':
                return 'flex-col';
            case 'column-reverse':
                return 'flex-col-reverse';
            default:
                return 'flex-row';
        }
    };

    const renderGridLayout = () => (
        <div className={cn("grid", containerSpacing, getGridColumns(), getFlexDirection())}>
            <AnimatePresence>
                {filteredFields.map((field, index) => (
                    <motion.div
                        key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}
                        variants={cardVariants[animationPreset]}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{delay: index * 0.1}}
                    >
                        {renderField(field)}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );

    const renderSectionFields = (fields: EntityFlexFormField[]) => (
        <div className={cn(
            "grid",
            densityConfig[density].spacing,
            getGridColumns()
        )}>
            {fields.map(field => (
                <div key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`}>
                    {renderField(field)}
                </div>
            ))}
        </div>
    );

    const renderSectionsLayout = () => {
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

    const renderAccordionLayout = () => {
        const sections = [...new Set(filteredFields.map(field => field.componentProps.section || 'Default'))];
        return (
            <Accordion
                type="single"
                collapsible
                className={cn("w-full", densityStyles.container)}
            >
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

    const renderTabsLayout = () => {
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
                    <TabsContent
                        key={section}
                        value={section}
                        className={densityStyles.padding}
                    >
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
                    </TabsContent>
                ))}
            </Tabs>
        );
    };

    const renderMasonryLayout = () => (
        <div className={cn(
            "columns-1 sm:columns-2 lg:columns-3 xl:columns-4",
            densityConfig[density].spacing,
            getFlexDirection()
        )}>
            {filteredFields.map((field) => (
                <div key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`} className={cn(
                    "break-inside-avoid",
                    densityStyles.padding
                )}>
                    {renderField(field)}
                </div>
            ))}
        </div>
    );

    const renderCarouselLayout = () => {
        return (
            <div className="relative overflow-hidden">
                <div className={cn(
                    "flex transition-transform duration-300 ease-in-out",
                    densityConfig[density].spacing,
                    getFlexDirection()
                )}
                     style={{transform: `translateX(-${carouselActiveIndex * 100}%)`}}>
                    {filteredFields.map((field) => (
                        <div key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`} className={cn(
                            "w-full flex-shrink-0",
                            densityStyles.padding
                        )}>
                            {renderField(field)}
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => setCarouselActiveIndex((prev) => Math.max(prev - 1, 0))}
                    className={cn(
                        "absolute left-0 top-1/2 transform -translate-y-1/2",
                        "bg-primary text-primary-foreground rounded-full",
                        densityStyles.padding
                    )}
                >
                    &lt;
                </button>
                <button
                    onClick={() => setCarouselActiveIndex((prev) =>
                        Math.min(prev + 1, filteredFields.length - 1)
                    )}
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
    };

    const renderTimelineLayout = () => (
        <div className={cn(
            "relative",
            densityStyles.container,
            getFlexDirection()
        )}>
            {filteredFields.map((field, index) => (
                <div key={`${field.uniqueFieldId}-${Math.random().toString(36).slice(2, 7)}`} className={cn(
                    "flex",
                    densityStyles.padding
                )}>
                    <div className={cn(
                        "flex-shrink-0 rounded-full bg-primary",
                        "flex items-center justify-center text-primary-foreground",
                        densityConfig[density].iconSize
                    )}>
                        {index + 1}
                    </div>
                    <div className={cn(
                        "flex-grow",
                        densityStyles.padding
                    )}>
                        {renderField(field)}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderLayout = () => {
        switch (layout) {
            case 'sections':
                return renderSectionsLayout();
            case 'accordion':
                return renderAccordionLayout();
            case 'tabs':
                return renderTabsLayout();
            case 'masonry':
                return renderMasonryLayout();
            case 'carousel':
                return renderCarouselLayout();
            case 'timeline':
                return renderTimelineLayout();
            case 'grid':
            default:
                return renderGridLayout();
        }
    };

    return (
        <motion.div
            ref={formRef}
            className={cn(
                "bg-card rounded-lg",
                isFullPage ? "w-full h-full" : "max-w-md mx-auto mt-2 shadow-xl",
                densityConfig[density].padding.md,
                className
            )}
            variants={containerVariants[animationPreset]}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className={cn("h-full", densityStyles.container)}
            >
                {enableSearch && (
                    <EntitySearchInput
                        type="text"
                        placeholder="Search fields..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={densityStyles.inputSize}
                    />
                )}

                <div className={cn(
                    isFullPage ? "h-[calc(100%-4rem)] overflow-y-auto" : "",
                    densityStyles.section
                )}>
                    {isSinglePage ? renderLayout() : (
                        <>
                            <motion.h2
                                className={cn(
                                    "font-bold mb-4 text-foreground",
                                    isFullPage ? "text-3xl" : "text-2xl",
                                    densityConfig[density].fontSize
                                )}
                                variants={cardVariants[animationPreset]}
                            >
                                {dynamicFieldInfo[currentStep].componentProps.dislayName}
                            </motion.h2>

                            <AnimatePresence mode="sync">
                                <motion.div
                                    key={currentStep}
                                    variants={getAnimationVariants(animationPreset)}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    {renderField(dynamicFieldInfo[currentStep])}
                                </motion.div>
                            </AnimatePresence>
                        </>
                    )}
                </div>

                <motion.div
                    className={cn("flex justify-between", densityStyles.gap)}
                    variants={cardVariants[animationPreset]}
                >
                    {/* Button components with density-aware styling */}
                    {!isSinglePage && (
                        <EntityButton
                            onClick={() => {
                                if (currentStep > 0) onPrevStep();
                            }}
                            disabled={currentStep === 0}
                            className={cn(
                                "space-y-6 bg-secondary text-secondary-foreground",
                                densityStyles.buttonSize
                            )}
                        >
                            Previous
                        </EntityButton>
                    )}
                    {isSinglePage || currentStep === dynamicFieldInfo.length - 1 ? (
                        <EntityButton type="submit" className="bg-primary text-primary-foreground">
                            Submit
                        </EntityButton>
                    ) : (
                         <EntityButton
                             onClick={() => {
                                 if (currentStep < dynamicFieldInfo.length - 1) onNextStep();
                             }}
                             className="bg-primary text-primary-foreground"
                         >
                             Next
                         </EntityButton>
                     )}
                </motion.div>
            </form>

            {!isSinglePage && (
                <motion.div
                    className={cn(
                        "mt-4 text-muted-foreground",
                        densityConfig[density].fontSize
                    )}
                    variants={cardVariants[animationPreset]}
                >
                    Step {currentStep + 1} of {dynamicFieldInfo.length}
                </motion.div>
            )}
        </motion.div>
    );
};

export default ArmaniForm;
