"use client";

import * as React from "react";
import {cn} from "@/lib/utils";
import {useMotionTemplate, useMotionValue, motion} from "motion/react";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: MatrxVariant;
}

const getVariantStyles = (variant: MatrxVariant = 'default') => {
    const baseStyles = `flex h-10 w-full border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-input rounded-md px-3 py-2 text-sm file:border-0 file:bg-transparent 
    file:text-sm file:font-medium placeholder:text-neutral-400 dark:placeholder-text-neutral-600 
    focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600
    disabled:cursor-not-allowed disabled:opacity-50
    dark:shadow-[0px_0px_1px_1px_var(--neutral-700)]
    group-hover/input:shadow-none transition duration-400`;

    switch (variant) {
        case 'destructive':
            return `${baseStyles} bg-destructive text-destructive-foreground`;
        case 'outline':
            return `${baseStyles} border-2`;
        case 'secondary':
            return `${baseStyles} bg-secondary text-secondary-foreground`;
        case 'ghost':
            return `${baseStyles} bg-transparent shadow-none`;
        case 'link':
            return `${baseStyles} bg-transparent underline-offset-4 hover:underline`;
        case 'primary':
            return `${baseStyles} bg-primary text-primary-foreground`;
        default:
            return baseStyles;
    }
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({className, type, variant = 'default', ...props}, ref) => {
        const radius = 100;
        const [visible, setVisible] = React.useState(false);
        let mouseX = useMotionValue(0);
        let mouseY = useMotionValue(0);

        function handleMouseMove({currentTarget, clientX, clientY}: any) {
            let {left, top} = currentTarget.getBoundingClientRect();
            mouseX.set(clientX - left);
            mouseY.set(clientY - top);
        }

        return (
            <motion.div
                style={{
                    background: useMotionTemplate`
                    radial-gradient(
                      ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
                      var(--blue-500),
                      transparent 80%
                    )
                  `,
                }}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                className="p-[2px] rounded-lg transition duration-300 group/input"
            >
                <input
                    type={type}
                    className={cn(getVariantStyles(variant), className)}
                    ref={ref}
                    {...props}
                />
            </motion.div>
        );
    }
);
Input.displayName = "Input";

interface EnterInputProps extends InputProps {
    onEnter?: () => void;
}

export const EnterInput = React.forwardRef<HTMLInputElement, EnterInputProps>(
    ({onEnter, ...props}, ref) => {
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && onEnter) {
                e.preventDefault();
                onEnter();
            }
        };

        return (
            <Input
                {...props}
                ref={ref}
                onKeyDown={(e) => {
                    handleKeyDown(e);
                    if (props.onKeyDown) {
                        props.onKeyDown(e);
                    }
                }}
            />
        );
    }
);

EnterInput.displayName = 'EnterInput';


export type ValidationRule = {
    isValid: (value: string) => boolean;
    errorMessage: string;
};

export type ValidationConfig = {
    type: keyof typeof VALIDATIONS | string;
    params?: any;
    errorMessage?: string;
};

// validations.ts
export const VALIDATIONS = {
    notBlank: {
        isValid: (value: string) => value.trim() !== '',
        errorMessage: 'This field is required'
    },
    email: {
        isValid: (value: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
        errorMessage: 'Invalid email address'
    },
    minLength: (min: number): ValidationRule => ({
        isValid: (value: string) => value.length >= min,
        errorMessage: `Must be at least ${min} characters`
    }),
    maxLength: (max: number): ValidationRule => ({
        isValid: (value: string) => value.length <= max,
        errorMessage: `Must be at most ${max} characters`
    }),
    numeric: {
        isValid: (value: string) => /^\d+$/.test(value),
        errorMessage: 'Must contain only numbers'
    },
    alphanumeric: {
        isValid: (value: string) => /^[a-zA-Z0-9]+$/.test(value),
        errorMessage: 'Must contain only letters and numbers'
    },
    phone: {
        isValid: (value: string) => /^\+?[\d\s-()]+$/.test(value),
        errorMessage: 'Invalid phone number'
    },
    url: {
        isValid: (value: string) => /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(value),
        errorMessage: 'Invalid URL'
    },
    password: {
        isValid: (value: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value),
        errorMessage: 'Password must be at least 8 characters and contain both letters and numbers'
    },
    noSpaces: {
        isValid: (value: string) => !/\s/.test(value),
        errorMessage: 'Cannot contain spaces'
    },
    date: {
        isValid: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value),
        errorMessage: 'Date must be in the format YYYY-MM-DD'
    },
    specialCharacters: {
        isValid: (value: string) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
        errorMessage: 'Must contain at least one special character'
    },
    boolean: {
        isValid: (value: string) => /^(true|false)$/i.test(value),
        errorMessage: 'Must be either true or false'
    },
    range: (min: number, max: number): ValidationRule => ({
        isValid: (value: string) => {
            const num = parseFloat(value);
            return !isNaN(num) && num >= min && num <= max;
        },
        errorMessage: `Must be between ${min} and ${max}`
    }),
    regex: (pattern: RegExp): ValidationRule => ({
        isValid: (value: string) => pattern.test(value),
        errorMessage: 'Invalid format'
    })
} as const;

interface ValidatedEnterInputProps extends Omit<EnterInputProps, 'onEnter'> {
    validations?: (ValidationConfig | keyof typeof VALIDATIONS)[];
    onEnter?: (value: string) => void | Promise<void>;
    preventSubmitOnInvalid?: boolean;
    showErrorsOnBlur?: boolean;  // defaults to true
}

const getValidationRule = (validation: ValidationConfig | keyof typeof VALIDATIONS): ValidationRule => {
    if (typeof validation === 'string') {
        const rule = VALIDATIONS[validation];
        if (typeof rule === 'function') {
            throw new Error(`Validation '${validation}' requires parameters`);
        }
        return rule as ValidationRule;
    }

    const baseValidation = VALIDATIONS[validation.type];
    if (typeof baseValidation === 'function') {
        const rule = baseValidation(validation.params);
        return {
            ...rule,
            errorMessage: validation.errorMessage || rule.errorMessage
        };
    }

    return {
        ...(baseValidation as ValidationRule),
        errorMessage: validation.errorMessage || (baseValidation as ValidationRule).errorMessage
    };
};


export const ValidatedEnterInput = React.forwardRef<HTMLInputElement, ValidatedEnterInputProps>(
    ({
        validations = [],
        onEnter,
        preventSubmitOnInvalid = true,
        showErrorsOnBlur = true,
        className,
        ...props
    }, ref) => {
        const [errors, setErrors] = React.useState<string[]>([]);
        const [isDirty, setIsDirty] = React.useState(false);

        const validate = (value: string): { isValid: boolean; errors: string[] } => {
            const errors: string[] = [];

            for (const validation of validations) {
                const rule = getValidationRule(validation);
                if (!rule.isValid(value)) {
                    errors.push(rule.errorMessage);
                }
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        };

        const handleValidation = (value: string) => {
            const validation = validate(value);
            setErrors(validation.errors);
            return validation.isValid;
        };

        const handleEnter = () => {
            const value = props.value as string;
            const isValid = handleValidation(value);

            if (!isValid && preventSubmitOnInvalid) return;

            onEnter?.(value);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            if (showErrorsOnBlur) {
                setIsDirty(true);
                handleValidation(e.target.value);
            }
            props.onBlur?.(e);
        };

        return (
            <div className="space-y-1">
                <EnterInput
                    {...props}
                    ref={ref}
                    onEnter={handleEnter}
                    onBlur={handleBlur}
                    className={cn(
                        errors.length > 0 && isDirty && "ring-2 ring-destructive",
                        className
                    )}
                />
                {errors.length > 0 && isDirty && (
                    <div className="text-sm text-destructive">
                        {errors.map((error, index) => (
                            <div key={index}>{error}</div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
);

ValidatedEnterInput.displayName = 'ValidatedEnterInput';


const BasicInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({className, type, variant = 'default', ...props}, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
BasicInput.displayName = "BasicInput"

interface InputWithPrefixProps extends Omit<InputProps, 'prefix'> {
    prefix?: React.ReactNode;
    wrapperClassName?: string;
}

const InputWithPrefix = React.forwardRef<HTMLInputElement, InputWithPrefixProps>(
    ({prefix, className, wrapperClassName, ...props}, ref) => {
        return (
            <div className={cn("relative", wrapperClassName)}>
                {prefix && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {prefix}
                    </div>
                )}
                <Input
                    ref={ref}
                    className={cn(prefix && "pl-10", className)}
                    {...props}
                />
            </div>
        );
    }
);
InputWithPrefix.displayName = "InputWithPrefix";

export {Input, BasicInput, InputWithPrefix};