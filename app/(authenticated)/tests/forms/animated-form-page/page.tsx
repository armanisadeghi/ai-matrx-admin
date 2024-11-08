// app/(authenticated)/tests/animated-form-modal/page.tsx

'use client';

import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from "@/lib/redux/store";
import { submitForm, updateFormField } from "@/lib/redux/slices/formSlice";
import { AnimatedFormModal, FlexAnimatedForm } from "@/components/matrx/AnimatedForm";
import { formFields } from "../constants/formData";
import { FlexAnimatedFormProps } from "@/types/AnimatedFormTypes";

// Define a type for common props
type CommonProps = Pick<FlexAnimatedFormProps, 'fields' | 'formState' | 'onUpdateField' | 'onSubmit' | 'layout' | 'direction' | 'enableSearch' | 'columns'>;

const AnimatedFormModalPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const formState = useSelector((state: RootState) => state.form);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSinglePageModalOpen, setSinglePageModalOpen] = useState(false);
    const [isMultiStepModalOpen, setMultiStepModalOpen] = useState(false);
    const [selectedVariation, setSelectedVariation] = useState('fullWidthSinglePage');
    const [selectedLayout, setSelectedLayout] = useState<FlexAnimatedFormProps['layout']>('grid');
    const [selectedDirection, setSelectedDirection] = useState<FlexAnimatedFormProps['direction']>('row');
    const [enableSearch, setEnableSearch] = useState(false);
    const [columns, setColumns] = useState<FlexAnimatedFormProps['columns']>(1);

    const handleUpdateField = (name: string, value: any) => {
        dispatch(updateFormField({ name, value }));
    };

    const handleSubmit = () => {
        dispatch(submitForm(formState));
        console.log('Form submitted:', formState);
        setSinglePageModalOpen(false);
        setMultiStepModalOpen(false);
    };

    const handleNextStep = () => {
        setCurrentStep((prev) => Math.min(prev + 1, formFields.length - 1));
    };

    const handlePrevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const renderSelectedVariation = () => {
        const commonProps: CommonProps = {
            fields: formFields,
            formState: formState,
            onUpdateField: handleUpdateField,
            onSubmit: handleSubmit,
            layout: selectedLayout,
            direction: selectedDirection,
            enableSearch: enableSearch,
            columns: columns,
        };

        switch (selectedVariation) {
            case 'fullWidthSinglePage':
                return (
                    <FlexAnimatedForm
                        {...commonProps}
                        isSinglePage={true}
                        isFullPage={true}
                    />
                );
            case 'fullWidthMultiStep':
                return (
                    <FlexAnimatedForm
                        {...commonProps}
                        isSinglePage={false}
                        isFullPage={true}
                        currentStep={currentStep}
                        onNextStep={handleNextStep}
                        onPrevStep={handlePrevStep}
                    />
                );
            case 'twoColumnSinglePage':
                return (
                    <FlexAnimatedForm
                        {...commonProps}
                        isSinglePage={true}
                        isFullPage={true}
                        columns={2}
                    />
                );
            case 'threeColumnSinglePage':
                return (
                    <FlexAnimatedForm
                        {...commonProps}
                        isSinglePage={true}
                        isFullPage={true}
                        columns={3}
                    />
                );
            case 'restrictedWidthSinglePage':
                return (
                    <div className="max-w-2xl mx-auto">
                        <FlexAnimatedForm
                            {...commonProps}
                            isSinglePage={true}
                            columns={1}
                        />
                    </div>
                );
            case 'singlePageModal':
                return (
                    <button
                        onClick={() => setSinglePageModalOpen(true)}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                    >
                        Open Single Page Modal
                    </button>
                );
            case 'multiStepModal':
                return (
                    <button
                        onClick={() => setMultiStepModalOpen(true)}
                        className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90 transition-colors"
                    >
                        Open Multi-Step Modal
                    </button>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-foreground">Animated Form Test Page</h1>

            {/* Enhanced Control Panel */}
            <div className="mb-8 flex flex-wrap gap-4">
                <select
                    value={selectedVariation}
                    onChange={(e) => setSelectedVariation(e.target.value)}
                    className="border border-input bg-background text-foreground rounded px-2 py-1"
                >
                    <option value="fullWidthSinglePage">Full Width Single Page</option>
                    <option value="fullWidthMultiStep">Full Width Multi-Step</option>
                    <option value="twoColumnSinglePage">Two Column Single Page</option>
                    <option value="threeColumnSinglePage">Three Column Single Page</option>
                    <option value="restrictedWidthSinglePage">Restricted Width Single Page</option>
                    <option value="singlePageModal">Single Page Modal</option>
                    <option value="multiStepModal">Multi-Step Modal</option>
                </select>

                <select
                    value={selectedLayout}
                    onChange={(e) => setSelectedLayout(e.target.value as FlexAnimatedFormProps['layout'])}
                    className="border border-input bg-background text-foreground rounded px-2 py-1"
                >
                    <option value="grid">Grid</option>
                    <option value="sections">Sections</option>
                    <option value="accordion">Accordion</option>
                    <option value="tabs">Tabs</option>
                    <option value="masonry">Masonry</option>
                    <option value="carousel">Carousel</option>
                    <option value="timeline">Timeline</option>
                </select>

                <select
                    value={selectedDirection}
                    onChange={(e) => setSelectedDirection(e.target.value as FlexAnimatedFormProps['direction'])}
                    className="border border-input bg-background text-foreground rounded px-2 py-1"
                >
                    <option value="row">Row</option>
                    <option value="column">Column</option>
                    <option value="row-reverse">Row Reverse</option>
                    <option value="column-reverse">Column Reverse</option>
                </select>

                <select
                    value={columns.toString()}
                    onChange={(e) => setColumns(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
                    className="border border-input bg-background text-foreground rounded px-2 py-1"
                >
                    <option value="1">1 Column</option>
                    <option value="2">2 Columns</option>
                    <option value="3">3 Columns</option>
                    <option value="4">4 Columns</option>
                    <option value="5">5 Columns</option>
                    <option value="6">6 Columns</option>
                    <option value="auto">Auto</option>
                </select>

                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={enableSearch}
                        onChange={(e) => setEnableSearch(e.target.checked)}
                        className="mr-2"
                    />
                    Enable Search
                </label>
            </div>

            {/* Selected Variation */}
            <div className="mb-8">
                {renderSelectedVariation()}
            </div>

            {/* Modals */}
            <AnimatedFormModal
                isOpen={isSinglePageModalOpen}
                onClose={() => setSinglePageModalOpen(false)}
                fields={formFields}
                formState={formState}
                onUpdateField={handleUpdateField}
                onSubmit={handleSubmit}
                isSinglePage={true}
            />
            <AnimatedFormModal
                isOpen={isMultiStepModalOpen}
                onClose={() => setMultiStepModalOpen(false)}
                fields={formFields}
                formState={formState}
                onUpdateField={handleUpdateField}
                onSubmit={handleSubmit}
                currentStep={currentStep}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                isSinglePage={false}
            />

            {/* Current Form State */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-2 text-foreground">Current Form State (Redux)</h2>
                <pre className="bg-background text-foreground p-4 rounded overflow-auto max-h-60 border border-input">
                    {JSON.stringify(formState, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default AnimatedFormModalPage;
