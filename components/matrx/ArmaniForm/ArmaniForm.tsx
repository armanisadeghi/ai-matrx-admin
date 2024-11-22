'use client';

import React, {useState, useRef} from "react";
import {motion, AnimatePresence} from "framer-motion";
import {cn} from "@/styles/themes/utils";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    EntityButton,
    EntityInput,
    EntityTextarea,
    EntitySelect,
    EntityCheckbox,
    EntityRadioGroup,
    EntityUUIDArray
} from "./field-components";
import {EntityTimePicker} from "@/components/matrx/ArmaniForm/field-components/time-picker";
import EntityColorPicker from "@/components/matrx/ArmaniForm/field-components/EntityColorPicker";
import EntityJsonEditor from "@/components/matrx/ArmaniForm/field-components/EntityJsonEditor";
import EntityFileUpload from "@/components/matrx/ArmaniForm/field-components/EntityFileUpload";
import EntityImageDisplay from "@/components/matrx/ArmaniForm/field-components/EntityImageDisplay";
import EntityStarRating from "@/components/matrx/ArmaniForm/field-components/EntityStarRating";
import {EntityDatePicker} from "@/components/matrx/ArmaniForm/field-components/EntityDatePicker";
import {EntitySwitch} from "@/components/matrx/ArmaniForm/field-components/EntitySwitch";
import {EntitySlider} from "@/components/matrx/ArmaniForm/field-components/EntitySlider";
import EntitySearchInput from "@/components/matrx/ArmaniForm/field-components/EntitySearchInput";
import {EntityNumberInput} from "./field-components/EntityNumberInput";
import {EntityPhoneInput} from "@/components/matrx/ArmaniForm/field-components/EntityPhoneInput";
import {
    cardVariants, containerVariants,
    densityConfig,
    getAnimationVariants,
    spacingConfig,
} from "@/config/ui/entity-layout-config";
import ActionFieldWrapper from "./action-system/ActionFieldWrapper";
import {EntityFlexFormField} from "@/components/matrx/Entity/types/entityForm";

export type FormFieldType =
    'text'
    | 'email'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'password'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'month'
    | 'week'
    | 'tel'
    | 'url'
    | 'color'
    | 'slider'
    | 'switch'
    | 'json'
    | 'file'
    | 'image'
    | 'rating';


export interface FormState {
    [key: string]: any;
}

export type FormDensity = 'normal' | 'compact' | 'comfortable';
export type AnimationPreset = 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';

export interface FlexAnimatedFormProps {
    fields: EntityFlexFormField[];
    formState: FormState;
    onUpdateField: (name: string, value: any) => void;
    onSubmit?: () => void;
    onSubmitUpdate?: (data: FormState) => void;
    onSubmitCreate?: (data: FormState) => void;
    onSubmitDelete?: () => void;
    currentStep?: number;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    isSinglePage?: boolean;
    className?: string;
    isFullPage?: boolean;
    columns?: number | 'auto' | { xs: number, sm: number, md: number, lg: number, xl: number };
    layout?: 'grid' | 'sections' | 'accordion' | 'tabs' | 'masonry' | 'carousel' | 'timeline';
    enableSearch?: boolean;
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    density?: FormDensity;
    animationPreset?: AnimationPreset;
}


const ArmaniForm: React.FC<FlexAnimatedFormProps> = (
    {
        fields,
        formState,
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
        ...props
    }) => {
    const [internalCurrentStep, setInternalCurrentStep] = useState(0);
    const currentStep = externalCurrentStep !== undefined ? externalCurrentStep : internalCurrentStep;
    const formRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
    const formVariants = getAnimationVariants(animationPreset);
    const containerSpacing = densityConfig[density].spacing;
    const densityStyles = spacingConfig[density];

    const internalOnNextStep = () => {
        setInternalCurrentStep((prevStep) => Math.min(prevStep + 1, fields.length - 1));
    };

    const internalOnPrevStep = () => {
        setInternalCurrentStep((prevStep) => Math.max(prevStep - 1, 0));
    };

    const onNextStep = externalOnNextStep || internalOnNextStep;
    const onPrevStep = externalOnPrevStep || internalOnPrevStep;

    const filteredFields = enableSearch
                           ? fields.filter(field =>
            field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            field.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
                           : fields;

    const renderField = (field: EntityFlexFormField) => {
        console.log('ArmaniForm renderField called with:', {
            field,
            hasActionKeys: !!field.actionKeys.length,
            type: field.defaultComponent || field.type
        });

        const commonProps = {
            field,
            value: formState[field.name] || '',
            onChange: (value: any) => onUpdateField(field.name, value),
            componentProps: field.componentProps || {},
            density,
            animationPreset,
        };

        const baseField = () => {
            console.log('baseField called for:', field.name);
            switch (field.defaultComponent) {
                case 'input':
                    return <EntityInput {...commonProps} />;
                case 'textarea':
                    return <EntityTextarea {...commonProps} />;
                case 'switch':
                    return (
                        <EntitySwitch
                            checked={formState[field.name] || false}
                            onCheckedChange={(checked) => onUpdateField(field.name, checked)}
                        />
                    );
                case 'uuidArray':
                    return <EntityUUIDArray {...commonProps} />;
                case 'number':
                    return <EntityNumberInput {...commonProps} />;

                case 'select':
                    return <EntitySelect {...commonProps} />;
                case 'checkbox':
                    return (
                        <EntityCheckbox
                            field={field}
                            checked={formState[field.name] || false}
                            onChange={(checked) => onUpdateField(field.name, checked)}
                        />
                    );
                case 'radio':
                    return <EntityRadioGroup layout="vertical" {...commonProps} />;
                case 'slider':
                    return (
                        <EntitySlider
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={[formState[field.name] || field.min]}
                            onValueChange={(value) => onUpdateField(field.name, value[0])}
                        />
                    );
                case 'date':
                    return (
                        <EntityDatePicker
                            value={formState[field.name]}
                            onChange={(date) => onUpdateField(field.name, date)}
                            placeholder={field.placeholder || 'Select a date'}
                            formatString={'MM/dd/yyyy'}
                        />
                    );
                case 'datetime':
                    return (
                        <EntityDatePicker
                            value={formState[field.name]}
                            onChange={(date) => onUpdateField(field.name, date)}
                            placeholder={field.placeholder || 'Select a date'}
                            formatString={'MM/dd/yyyy'}
                        />
                    );

                case 'time':
                    return (
                        <EntityTimePicker
                            value={formState[field.name]}
                            onChange={(time) => onUpdateField(field.name, time)}
                        />
                    );
                case 'tel':
                    return <EntityPhoneInput {...commonProps} />;

                case 'color':
                    return (
                        <EntityColorPicker
                            color={formState[field.name]}
                            onChange={(color) => onUpdateField(field.name, color)}
                        />
                    );
                case 'json':
                    return (
                        <EntityJsonEditor
                            title={field.label}
                            data={formState[field.name]}
                            onChange={(json) => onUpdateField(field.name, json)}
                            isMinimized={false}
                        />
                    );
                case 'file':
                    return (
                        <EntityFileUpload
                            onChange={(files) => onUpdateField(field.name, files)}
                        />
                    );
                case 'image':
                    return (
                        <EntityImageDisplay
                            src={field.src || formState[field.name]}
                            alt={field.alt || field.label}
                        />
                    );
                case 'rating':
                    return (
                        <EntityStarRating
                            rating={formState[field.name] || 0}
                            onChange={(rating) => onUpdateField(field.name, rating)}
                            color={'amber'}
                            size={'md'}
                            disabled={field.disabled || false}
                            viewOnly={false}
                        />
                    );
                case 'text':
                    console.log('ERROR ------- ERROR!!!!  Field Type TEXT, which should not exist:', field.type);
                    return <EntityInput {...commonProps} />;

                case 'email':
                case 'password':
                case 'url':
                    return <EntityInput {...commonProps} />;
                default:
                    console.log('ERROR ------- ERROR!!!!  Unknown field type:', field.type, 'defaultComponent:', field.defaultComponent);
                    return null;
            }
        };

        if (!field.actionKeys?.length) {
            console.log('No actions, returning base field for:', field.name);
            return baseField();
        }

        console.log('Wrapping field with actions:', field.name);
        return (
            <ActionFieldWrapper
                field={field}
                value={commonProps.value}
                onChange={commonProps.onChange}
                renderBaseField={baseField}
                density={density}
                animationPreset={animationPreset}
                renderField={renderField}
            />
        );
    };

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
                            key={field.name}
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

        const renderSectionsLayout = () => {
            const sections = [...new Set(filteredFields.map(field => field.section || 'Default'))];
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
                                    .filter(field => (field.section || 'Default') === section)
                                    .map(field => (
                                        <div key={`${section}-${field.name}`}>
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
            const sections = [...new Set(filteredFields.map(field => field.section || 'Default'))];
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
                                        .filter(field => (field.section || 'Default') === section)
                                        .map(field => (
                                            <div key={`${section}-${field.name}`}>
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
            const sections = [...new Set(filteredFields.map(field => field.section || 'Default'))];
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
                                    .filter(field => (field.section || 'Default') === section)
                                    .map(field => (
                                        <div key={`${section}-${field.name}`}>
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
                    <div key={field.name} className={cn(
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
                            <div key={field.name} className={cn(
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
                    <div key={field.name} className={cn(
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
                                    {fields[currentStep].label}
                                </motion.h2>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentStep}
                                        variants={getAnimationVariants(animationPreset)}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                    >
                                        {renderField(fields[currentStep])}
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
                        {isSinglePage || currentStep === fields.length - 1 ? (
                            <EntityButton type="submit" className="bg-primary text-primary-foreground">
                                Submit
                            </EntityButton>
                        ) : (
                             <EntityButton
                                 onClick={() => {
                                     if (currentStep < fields.length - 1) onNextStep();
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
                        Step {currentStep + 1} of {fields.length}
                    </motion.div>
                )}
            </motion.div>
        );
    };

    export default ArmaniForm;
