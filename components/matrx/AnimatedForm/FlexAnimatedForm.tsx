// components/matrix/AnimatedForm/FormComponent.tsx
'use client';

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/styles/themes/utils";
import AnimatedInput from "./AnimatedInput";
import AnimatedTextarea from "./AnimatedTextarea";
import AnimatedSelect from "./AnimatedSelect";
import AnimatedCheckbox from "./AnimatedCheckbox";
import AnimatedRadioGroup from "./AnimatedRadioGroup";
import AnimatedButton from "./AnimatedButton";
import { AnimatedFormProps, FormField } from "./types";

interface ExtendedAnimatedFormProps extends AnimatedFormProps {
    className?: string;
    isFullPage?: boolean;
    enableScroll?: boolean;
    columns?: number | 'auto';
}

const FlexAnimatedForm: React.FC<ExtendedAnimatedFormProps> = ({
                                                               fields,
                                                               formState,
                                                               onUpdateField,
                                                               onSubmit,
                                                               currentStep: externalCurrentStep,
                                                               onNextStep: externalOnNextStep,
                                                               onPrevStep: externalOnPrevStep,
                                                               isSinglePage = false,
                                                               className,
                                                               isFullPage = false,
                                                               enableScroll = true,
                                                               columns = 1,
                                                               ...props
                                                           }) => {
    const [internalCurrentStep, setInternalCurrentStep] = useState(0);
    const currentStep = externalCurrentStep !== undefined ? externalCurrentStep : internalCurrentStep;
    const formRef = useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = useState(false);

    const internalOnNextStep = () => {
        setInternalCurrentStep((prevStep) => Math.min(prevStep + 1, fields.length - 1));
    };

    const internalOnPrevStep = () => {
        setInternalCurrentStep((prevStep) => Math.max(prevStep - 1, 0));
    };

    const onNextStep = externalOnNextStep ? externalOnNextStep : internalOnNextStep;
    const onPrevStep = externalOnPrevStep ? externalOnPrevStep : internalOnPrevStep;

    useEffect(() => {
        const checkScrollable = () => {
            if (formRef.current && enableScroll) {
                setIsScrollable(formRef.current.scrollHeight > formRef.current.clientHeight);
            }
        };

        checkScrollable();
        window.addEventListener('resize', checkScrollable);

        return () => {
            window.removeEventListener('resize', checkScrollable);
        };
    }, [currentStep, fields, enableScroll]);

    const renderField = (field: FormField) => {
        const commonProps = {
            field,
            value: formState[field.name] || '',
            onChange: (value: any) => onUpdateField(field.name, value),
        };

        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'password':
            case 'date':
            case 'time':
            case 'datetime-local':
            case 'month':
            case 'week':
            case 'tel':
            case 'url':
            case 'color':
                return <AnimatedInput {...commonProps} />;
            case 'textarea':
                return <AnimatedTextarea {...commonProps} />;
            case 'select':
                return <AnimatedSelect {...commonProps} />;
            case 'checkbox':
                return (
                    <AnimatedCheckbox
                        field={field}
                        checked={formState[field.name] || false}
                        onChange={(checked) => onUpdateField(field.name, checked)}
                    />
                );
            case 'radio':
                return <AnimatedRadioGroup {...commonProps} />;
            default:
                return null;
        }
    };

    const getGridColumns = () => {
        if (columns === 'auto') {
            return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        }
        switch (columns) {
            case 1: return 'grid-cols-1';
            case 2: return 'grid-cols-1 sm:grid-cols-2';
            case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
            case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
            default: return 'grid-cols-1';
        }
    };

    return (
        <motion.div
            ref={formRef}
            className={cn(
                "bg-card rounded-lg",
                isFullPage ? "w-full" : "max-w-md mx-auto mt-4 shadow-xl",
                isScrollable && enableScroll && "max-h-[65vh] overflow-y-auto",
                className
            )}
            initial={{ opacity: 0, scale: isFullPage ? 0.98 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            {...props}
        >
            <form onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }} className={cn("space-y-6", isFullPage ? "" : "p-4")}>
                {isSinglePage ? (
                    <div className={cn("grid gap-6", getGridColumns())}>
                        <AnimatePresence>
                            {fields.map((field, index) => (
                                <motion.div
                                    key={field.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1, duration: 0.3 }}
                                >
                                    {renderField(field)}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <>
                        <motion.h2
                            className={cn("font-bold mb-4 text-foreground", isFullPage ? "text-3xl" : "text-2xl")}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            {fields[currentStep].label}
                        </motion.h2>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                {renderField(fields[currentStep])}
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}

                <motion.div
                    className="flex justify-between mt-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    {!isSinglePage && (
                        <AnimatedButton
                            onClick={() => {
                                if (currentStep > 0) onPrevStep();
                            }}
                            disabled={currentStep === 0}
                            className="space-y-6 bg-secondary text-secondary-foreground"
                        >
                            Previous
                        </AnimatedButton>
                    )}
                    {isSinglePage || currentStep === fields.length - 1 ? (
                        <AnimatedButton type="submit" className="bg-primary text-primary-foreground">
                            Submit
                        </AnimatedButton>
                    ) : (
                        <AnimatedButton
                            onClick={() => {
                                if (currentStep < fields.length - 1) onNextStep();
                            }}
                            className="bg-primary text-primary-foreground"
                        >
                            Next
                        </AnimatedButton>
                    )}
                </motion.div>
            </form>

            {!isSinglePage && (
                <motion.div
                    className="mt-4 text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    Step {currentStep + 1} of {fields.length}
                </motion.div>
            )}
        </motion.div>
    );
};

export default FlexAnimatedForm;