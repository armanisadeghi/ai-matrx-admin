// hooks/useContainerValidation.ts
import { useState, useEffect } from 'react';
import { Container } from '../gridTypes';
import { isValidRectangle } from '../gridHelpers';

export interface ValidationStatus {
    [key: string]: {
        isValid: boolean;
        message?: string;
    }
}

export const useContainerValidation = (containers: Container[]) => {
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>({});

    useEffect(() => {
        const newValidationStatus: ValidationStatus = {};
        containers.forEach(container => {
            const isValid = isValidRectangle(container.boxes);
            newValidationStatus[container.id] = {
                isValid,
                message: !isValid && container.boxes.length > 0
                         ? 'Selection must form a rectangle'
                         : undefined
            };
        });
        setValidationStatus(newValidationStatus);
    }, [containers]);

    const isContainerValid = (containerId: string): boolean => {
        return validationStatus[containerId]?.isValid ?? true;
    };

    const getValidationMessage = (containerId: string): string | undefined => {
        return validationStatus[containerId]?.message;
    };

    return {
        validationStatus,
        isContainerValid,
        getValidationMessage
    };
};
