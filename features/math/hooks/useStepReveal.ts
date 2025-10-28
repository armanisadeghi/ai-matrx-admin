// /math/hooks/useStepReveal.ts

'use client';

import { useState, useCallback } from 'react';

export const useStepReveal = (totalSteps: number) => {
    const [currentStep, setCurrentStep] = useState(0);

    const showStep = useCallback(() => {
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }, [totalSteps]);

    const resetSteps = useCallback(() => {
        setCurrentStep(0);
    }, []);

    return {
        currentStep,
        showStep,
        resetSteps,
        canShowNextStep: currentStep < totalSteps,
        canReset: currentStep > 0,
    };
};
