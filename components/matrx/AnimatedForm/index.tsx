import React from 'react';
import { motion, AnimatePresence, MotionProps } from 'framer-motion';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { Check } from 'lucide-react';

// Define types for form fields and props
export type FormFieldType = 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'password' | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'tel' | 'url' | 'color';

export interface FormField {
    name: string;
    label: string;
    type: FormFieldType;
    options?: string[];
    placeholder?: string;
    required?: boolean;
}

export interface FormState {
    [key: string]: any;
}

interface AnimatedFormProps {
    fields: FormField[];
    formState: FormState;
    onUpdateField: (name: string, value: any) => void;
    onSubmit: () => void;
    currentStep: number;
    onNextStep: () => void;
    onPrevStep: () => void;
}

// Reusable components
const AnimatedInput: React.FC<{
    field: FormField;
    value: string;
    onChange: (value: string) => void;
}> = ({ field, value, onChange }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
    >
        <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
        <motion.input
            type={field.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            whileFocus={{ scale: 1.02 }}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
        />
    </motion.div>
);

const AnimatedTextarea: React.FC<{
    field: FormField;
    value: string;
    onChange: (value: string) => void;
}> = ({ field, value, onChange }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
    >
        <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
        <motion.textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            whileFocus={{ scale: 1.02 }}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
        />
    </motion.div>
);

const AnimatedSelect: React.FC<{
    field: FormField;
    value: string;
    onChange: (value: string) => void;
}> = ({ field, value, onChange }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
    >
        <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
        <motion.select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            whileFocus={{ scale: 1.02 }}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
        >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </motion.select>
    </motion.div>
);

const AnimatedCheckbox: React.FC<{
    field: FormField;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ field, checked, onChange }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-4 flex items-center"
    >
        <RadixCheckbox.Root
            checked={checked}
            onCheckedChange={onChange}
            className="flex h-5 w-5 appearance-none items-center justify-center rounded-md border border-input outline-none focus:ring-2 focus:ring-primary"
        >
            <RadixCheckbox.Indicator>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Check className="h-4 w-4 text-primary" />
                </motion.div>
            </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        <label className="ml-2 text-sm font-medium text-foreground">{field.label}</label>
    </motion.div>
);

const AnimatedRadioGroup: React.FC<{
    field: FormField;
    value: string;
    onChange: (value: string) => void;
}> = ({ field, value, onChange }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
    >
        <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
        <RadixRadioGroup.Root className="flex flex-col space-y-2" value={value} onValueChange={onChange}>
            {field.options?.map((option) => (
                <motion.div key={option} className="flex items-center" whileHover={{ scale: 1.05 }}>
                    <RadixRadioGroup.Item
                        id={option}
                        value={option}
                        className="h-4 w-4 rounded-full border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <RadixRadioGroup.Indicator
                            className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-primary" />
                    </RadixRadioGroup.Item>
                    <label htmlFor={option} className="ml-2 text-sm font-medium text-foreground">
                        {option}
                    </label>
                </motion.div>
            ))}
        </RadixRadioGroup.Root>
    </motion.div>
);

const AnimatedButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & MotionProps> = ({ children, ...props }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-4 py-2 bg-primary text-primaryForeground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
        {...props}
    >
        {children}
    </motion.button>
);

// Main Form Component
const AnimatedForm: React.FC<AnimatedFormProps> = ({
                                                       fields,
                                                       formState,
                                                       onUpdateField,
                                                       onSubmit,
                                                       currentStep,
                                                       onNextStep,
                                                       onPrevStep,
                                                   }) => {
    const currentField = fields[currentStep];

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
                return (
                    <AnimatedInput
                        field={field}
                        value={formState[field.name] || ''}
                        onChange={(value) => onUpdateField(field.name, value)}
                    />
                );
            case 'textarea':
                return (
                    <AnimatedTextarea
                        field={field}
                        value={formState[field.name] || ''}
                        onChange={(value) => onUpdateField(field.name, value)}
                    />
                );
            case 'select':
                return (
                    <AnimatedSelect
                        field={field}
                        value={formState[field.name] || ''}
                        onChange={(value) => onUpdateField(field.name, value)}
                    />
                );
            case 'checkbox':
                return (
                    <AnimatedCheckbox
                        field={field}
                        checked={formState[field.name] || false}
                        onChange={(checked) => onUpdateField(field.name, checked)}
                    />
                );
            case 'radio':
                return (
                    <AnimatedRadioGroup
                        field={field}
                        value={formState[field.name] || ''}
                        onChange={(value) => onUpdateField(field.name, value)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <motion.div
            className="max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <form onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }} className="space-y-6">
                <motion.h2
                    className="text-2xl font-bold mb-4 text-foreground"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    {currentField.label}
                </motion.h2>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderField(currentField)}
                    </motion.div>
                </AnimatePresence>

                <motion.div
                    className="flex justify-between mt-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <AnimatedButton onClick={onPrevStep} disabled={currentStep === 0}>
                        Previous
                    </AnimatedButton>
                    {currentStep < fields.length - 1 ? (
                        <AnimatedButton onClick={onNextStep}>
                            Next
                        </AnimatedButton>
                    ) : (
                        <AnimatedButton type="submit">
                            Submit
                        </AnimatedButton>
                    )}
                </motion.div>
            </form>

            <motion.div
                className="mt-4 text-sm text-mutedForeground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                Step {currentStep + 1} of {fields.length}
            </motion.div>
        </motion.div>
    );
};

export default AnimatedForm;