// app/(authenticated)/tests/animated-modal-tabs/hold-hold-page.tsx

'use client';

import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { AnimatedTabModal, FormField, TabData } from "@/components/matrx/AnimatedForm";
import { AppDispatch, RootState } from "@/lib/redux/store";
import { submitForm, updateFormField } from "@/lib/redux/slices/formSlice";

const AnimatedTabModalPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const formState = useSelector((state: RootState) => state.form);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("view");

    const handleUpdateField = (name: string, value: any) => {
        dispatch(updateFormField({ name, value }));
    };

    const handleSubmit = () => {
        dispatch(submitForm(formState));
        console.log('Form submitted:', formState);
        setIsModalOpen(false);
    };

    const formFields: FormField[] = [
        {name: 'name', label: 'Full Name', type: 'text'},
        {name: 'email', label: 'Email', type: 'email'},
        {name: 'age', label: 'Age', type: 'number'},
        {name: 'country', label: 'Country', type: 'select', options: ['USA', 'Canada', 'UK', 'Australia']},
        {name: 'bio', label: 'Bio', type: 'textarea'},
        {name: 'newsletter', label: 'Subscribe to newsletter', type: 'checkbox'},
        {name: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female', 'Other']},
    ];

    const tabs: TabData[] = [
        {
            value: "view",
            label: "View",
            fields: formFields.map(field => ({ ...field, disabled: true })),
            buttons: [
                { label: 'Edit', onClick: () => setActiveTab('edit'), className: 'bg-primary text-primary-foreground' },
            ]
        },
        {
            value: "edit",
            label: "Edit",
            fields: formFields,
            buttons: [
                { label: 'Cancel', onClick: () => setActiveTab('view'), className: 'bg-secondary text-secondary-foreground' },
                { label: 'Save', onClick: handleSubmit, className: 'bg-primary text-primary-foreground' },
            ]
        },
        {
            value: "delete",
            label: "Delete",
            fields: formFields.map(field => ({ ...field, disabled: true })),
            buttons: [
                { label: 'Confirm Delete', onClick: () => console.log('Delete confirmed'), className: 'bg-destructive text-destructive-foreground' },
            ]
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Animated Form Modal With Tabs Test (Redux Integration)</h1>

            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
            >
                Open Modal With Tabs
            </button>
            <AnimatedTabModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                onUpdateField={handleUpdateField}
                formState={formState}
                title="User Information"
                description="View, Edit or Delete user information"
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isSinglePage={true}
            />
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-2">Current Form State (Redux)</h2>
                <pre className="bg-background p-4 rounded overflow-auto max-h-60">
                    {JSON.stringify(formState, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default AnimatedTabModalPage;
