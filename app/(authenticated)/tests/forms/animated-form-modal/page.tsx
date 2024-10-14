// app/(authenticated)/tests/animated-form-modal/hold-hold-page.tsx

'use client';

import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { AnimatedFormModal } from "@/components/matrx/AnimatedForm";
import { AppDispatch, RootState } from "@/lib/redux/store";
import { submitForm, updateFormField } from "@/lib/redux/slices/formSlice";
import { FormField } from "@/types/AnimatedFormTypes";

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

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Animated Form Modal Test (Redux Integration)</h1>

            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Single Page Form Modal</h2>
                    <button
                        onClick={() => setSinglePageModalOpen(true)}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                    >
                        Open Single Page Modal
                    </button>
                    <AnimatedFormModal
                        isOpen={isSinglePageModalOpen}
                        onClose={() => setSinglePageModalOpen(false)}
                        fields={formFields}
                        formState={formState}
                        onUpdateField={handleUpdateField}
                        onSubmit={handleSubmit}
                        isSinglePage={true}
                    />
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2">Multi-Step Form Modal</h2>
                    <button
                        onClick={() => setMultiStepModalOpen(true)}
                        className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90 transition-colors"
                    >
                        Open Multi-Step Modal
                    </button>
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
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-2">Current Form State (Redux)</h2>
                <pre className="bg-background p-4 rounded overflow-auto max-h-60">
          {JSON.stringify(formState, null, 2)}
        </pre>
            </div>
        </div>
    );
};

export default AnimatedFormModalPage;
