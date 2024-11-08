'use client';

import React, {useState} from "react";
import {useDispatch, useSelector} from 'react-redux';
import {AppDispatch, RootState} from "@/lib/redux/store";
import {submitForm, updateFormField} from "@/lib/redux/slices/formSlice";
import {formFields} from "@/app/(authenticated)/tests/forms/constants/formData";
import { FlexAnimatedForm } from "@/components/matrx/AnimatedForm";




const DemoPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const formState = useSelector((state: RootState) => state.form);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSinglePageModalOpen, setSinglePageModalOpen] = useState(false);
    const [isMultiStepModalOpen, setMultiStepModalOpen] = useState(false);

    const handleUpdateField = (name: string, value: any) => {
        dispatch(updateFormField({name, value}));
    };


    function handleSubmit() {
        console.log('Form submitted:', formState);
    }

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
}

export default DemoPage;
