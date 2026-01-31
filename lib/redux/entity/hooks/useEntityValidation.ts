'use client';
import * as React from 'react';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';

interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

interface FieldValidationRule {
    validate: (value: any, field: any) => Promise<boolean> | boolean;
    message: string;
}

interface EntityValidationRule {
    validate: (data: Partial<EntityData<any>>) => Promise<boolean> | boolean;
    message: string;
}

interface UseEntityValidationReturn {
    validationErrors: Record<string, string>;
    validateField: (fieldName: string, value: any) => Promise<boolean>;
    validateNativeFields: (data: Partial<EntityData<any>>) => Promise<ValidationResult>;
    validateNonNativeFields: (data: Partial<EntityData<any>>) => Promise<ValidationResult>;
    validateForm: (formData: Partial<EntityData<any>>) => Promise<boolean>;
    setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    clearValidationErrors: () => void;
    addFieldValidationRule: (fieldName: string, rule: FieldValidationRule) => void;
    addEntityValidationRule: (rule: EntityValidationRule) => void;
}

export function useEntityValidation<TEntity extends EntityKeys>(
    entityKey: TEntity,
): UseEntityValidationReturn {
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);

    const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
    const [fieldValidationRules] = React.useState<Record<string, FieldValidationRule[]>>({});
    const [entityValidationRules] = React.useState<EntityValidationRule[]>([]);

    const addFieldValidationRule = React.useCallback((fieldName: string, rule: FieldValidationRule) => {
        fieldValidationRules[fieldName] = fieldValidationRules[fieldName] || [];
        fieldValidationRules[fieldName].push(rule);
        console.log(`addFieldValidationRule: Added rule for field "${fieldName}".`);
    }, [fieldValidationRules]);

    const addEntityValidationRule = React.useCallback((rule: EntityValidationRule) => {
        entityValidationRules.push(rule);
        console.log(`addEntityValidationRule: Added entity-level validation rule.`);
    }, [entityValidationRules]);

    const validateField = React.useCallback(async (fieldName: string, value: any): Promise<boolean> => {
        console.log(`validateField: Starting validation for field "${fieldName}" with value:`, value);

        const field = Object.values(fieldInfo).find(f => f.name === fieldName);
        if (!field) {
            console.log(`validateField: Field "${fieldName}" not found in fieldInfo.`);
            return false;
        }

        // Built-in validation
        if (field.isRequired && (value === null || value === undefined || value === '')) {
            console.log(`validateField: "${fieldName}" failed required check.`);
            setValidationErrors(prev => ({
                ...prev,
                [fieldName]: `${field.displayName} is required`
            }));
            return false;
        }

        if (field.maxLength && String(value).length > field.maxLength) {
            console.log(`validateField: "${fieldName}" exceeds maxLength of ${field.maxLength}.`);
            setValidationErrors(prev => ({
                ...prev,
                [fieldName]: `${field.displayName} exceeds maximum length of ${field.maxLength}`
            }));
            return false;
        }

        // Custom field validation rules
        const rules = fieldValidationRules[fieldName] || [];
        for (const rule of rules) {
            const isValid = await rule.validate(value, field);
            if (!isValid) {
                console.log(`validateField: "${fieldName}" failed custom validation rule.`);
                setValidationErrors(prev => ({
                    ...prev,
                    [fieldName]: rule.message
                }));
                return false;
            }
        }

        // Clear error if validation passes
        console.log(`validateField: "${fieldName}" passed validation.`);
        setValidationErrors(prev => {
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });

        return true;
    }, [fieldInfo, fieldValidationRules]);

    const validateNativeFields = React.useCallback(async (data: Partial<EntityData<TEntity>>): Promise<ValidationResult> => {
        console.log('validateNativeFields: Starting validation for native fields.');
        const nativeFields = Object.values(fieldInfo).filter(field => field.isNative);
        const errors: Record<string, string> = {};

        for (const field of nativeFields) {
            const isValid = await validateField(field.name, data[field.name]);
            if (!isValid) {
                console.log(`validateNativeFields: Field "${field.name}" failed validation.`);
                errors[field.name] = validationErrors[field.name] || `Invalid value for ${field.displayName}`;
            }
        }

        const isValid = Object.keys(errors).length === 0;
        console.log('validateNativeFields: Validation result:', { isValid, errors });
        return { isValid, errors };
    }, [fieldInfo, validateField, validationErrors]);

    const validateNonNativeFields = React.useCallback(async (data: Partial<EntityData<TEntity>>): Promise<ValidationResult> => {
        console.log('validateNonNativeFields: Starting validation for non-native fields.');
        const nonNativeFields = Object.values(fieldInfo).filter(field => !field.isNative);
        const errors: Record<string, string> = {};

        for (const field of nonNativeFields) {
            const isValid = await validateField(field.name, data[field.name]);
            if (!isValid) {
                console.log(`validateNonNativeFields: Field "${field.name}" failed validation.`);
                errors[field.name] = validationErrors[field.name] || `Invalid value for ${field.displayName}`;
            }
        }

        const isValid = Object.keys(errors).length === 0;
        console.log('validateNonNativeFields: Validation result:', { isValid, errors });
        return { isValid, errors };
    }, [fieldInfo, validateField, validationErrors]);

    const validateForm = React.useCallback(async (formData: Partial<EntityData<TEntity>>): Promise<boolean> => {
        console.log('validateForm: Starting form validation with formData.', formData);

        const nativeValidation = await validateNativeFields(formData);
        const nonNativeValidation = await validateNonNativeFields(formData);

        // Entity-level validation
        const entityErrors: Record<string, string> = {};
        for (const rule of entityValidationRules) {
            const isValid = await rule.validate(formData);
            if (!isValid) {
                console.log('validateForm: Entity-level validation failed.');
                entityErrors['_entity'] = rule.message;
                break;
            }
        }

        const combinedErrors = {
            ...nativeValidation.errors,
            ...nonNativeValidation.errors,
            ...entityErrors
        };

        setValidationErrors(combinedErrors);
        const isValid = Object.keys(combinedErrors).length === 0;
        console.log('validateForm: Validation result:', { isValid, combinedErrors });
        return isValid;
    }, [validateNativeFields, validateNonNativeFields, entityValidationRules]);


    const clearValidationErrors = React.useCallback(() => {
        console.log('clearValidationErrors: Clearing all validation errors.');
        setValidationErrors({});
    }, []);

    return {
        validationErrors,
        validateField,
        validateNativeFields,
        validateNonNativeFields,
        validateForm,
        setValidationErrors,
        clearValidationErrors,
        addFieldValidationRule,
        addEntityValidationRule,
    };
}
