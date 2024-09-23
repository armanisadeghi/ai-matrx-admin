// File location: @/app/tests/animated-form/page.tsx
'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AnimatedForm, { FormField, FormState } from "@/components/matrx/AnimatedForm";
import {AppDispatch, RootState} from "@/lib/redux/store";
import {submitForm, updateFormField} from "@/lib/redux/slices/formSlice";

// import { updateFormField, submitForm } from '../path/to/your/formSlice';

const formFields: FormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'age', label: 'Age', type: 'number', required: true },
  { name: 'country', label: 'Country', type: 'select', options: ['USA', 'Canada', 'UK', 'Australia'], required: true },
  { name: 'bio', label: 'Bio', type: 'textarea' },
  { name: 'newsletter', label: 'Subscribe to newsletter', type: 'checkbox' },
  { name: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female', 'Other'], required: true },
];

export default function FormPage() {
  const dispatch = useDispatch<AppDispatch>();
  const formState = useSelector((state: RootState) => state.form);
  const [currentStep, setCurrentStep] = useState(0);

  const handleUpdateField = (name: string, value: any) => {
    dispatch(updateFormField({ name, value }));
  };

  const handleSubmit = () => {
    dispatch(submitForm(formState));
    // Handle form submission logic here
  };

  const handleNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, formFields.length - 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
      <AnimatedForm
          fields={formFields}
          formState={formState}
          onUpdateField={handleUpdateField}
          onSubmit={handleSubmit}
          currentStep={currentStep}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
      />
  );
}
