// app/(authenticated)/tests/animated-form-modal/page.tsx

'use client';

import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { FlexAnimatedForm, AnimatedFormModal, FormField } from "@/components/matrx/AnimatedForm";
import { AppDispatch, RootState } from "@/lib/redux/store";
import { submitForm, updateFormField } from "@/lib/redux/slices/formSlice";

const formFields: FormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'age', label: 'Age', type: 'number', required: true },
    { name: 'country', label: 'Country', type: 'select', options: ['USA', 'Canada', 'UK', 'Australia'], required: true },
    { name: 'bio', label: 'Bio', type: 'textarea' },
    { name: 'newsletter', label: 'Subscribe to newsletter', type: 'checkbox' },
    { name: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female', 'Other'], required: true },
];

const AnimatedFormModalPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const formState = useSelector((state: RootState) => state.form);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSinglePageModalOpen, setSinglePageModalOpen] = useState(false);
    const [isMultiStepModalOpen, setMultiStepModalOpen] = useState(false);
    const [selectedVariation, setSelectedVariation] = useState('fullWidthSinglePage');

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
        switch (selectedVariation) {
            case 'fullWidthSinglePage':
                return (
                    <FlexAnimatedForm
                        fields={formFields}
                        formState={formState}
                        onUpdateField={handleUpdateField}
                        onSubmit={handleSubmit}
                        isSinglePage={true}
                        isFullPage={true}
                        columns="auto"
                    />
                );
            case 'fullWidthMultiStep':
                return (
                    <FlexAnimatedForm
                        fields={formFields}
                        formState={formState}
                        onUpdateField={handleUpdateField}
                        onSubmit={handleSubmit}
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
                        fields={formFields}
                        formState={formState}
                        onUpdateField={handleUpdateField}
                        onSubmit={handleSubmit}
                        isSinglePage={true}
                        isFullPage={true}
                        columns={2}
                    />
                );
            case 'threeColumnSinglePage':
                return (
                    <FlexAnimatedForm
                        fields={formFields}
                        formState={formState}
                        onUpdateField={handleUpdateField}
                        onSubmit={handleSubmit}
                        isSinglePage={true}
                        isFullPage={true}
                        columns={3}
                    />
                );
            case 'restrictedWidthSinglePage':
                return (
                    <div className="max-w-2xl mx-auto">
                        <FlexAnimatedForm
                            fields={formFields}
                            formState={formState}
                            onUpdateField={handleUpdateField}
                            onSubmit={handleSubmit}
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

            {/* Control Panel */}
            <div className="mb-8 flex flex-wrap gap-2">
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
