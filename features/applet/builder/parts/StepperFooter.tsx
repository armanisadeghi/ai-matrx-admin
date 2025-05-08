"use client";

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { ArrowBigRight, ArrowRight, FastForward, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepCompletion {
    isComplete: boolean;
    canProceed: boolean;
    message?: string;
    footerButtons?: ReactNode;
}

interface StepperFooterProps {
    activeStep: number;
    totalSteps: number;
    currentStepCompletion: StepCompletion;
    selectedAppId: string | null;
    isLoading: boolean;
    onNext: () => void;
    onBack: () => void;
    onReset: () => void;
    onLaunchApp?: () => void;
    backButtonText?: string;
    resetButtonText?: string;
    nextButtonText?: string;
    finalStepButtonText?: string;
    secondToLastStepButtonText?: string;
    launchButtonText?: string;
    showLaunchButton?: boolean;
}

export const StepperFooter: React.FC<StepperFooterProps> = ({
    activeStep,
    totalSteps,
    currentStepCompletion,
    selectedAppId,
    isLoading,
    onNext,
    onBack,
    onReset,
    onLaunchApp,
    backButtonText = "Back",
    resetButtonText = "Select Different App",
    nextButtonText = "Next",
    finalStepButtonText = "Finish",
    secondToLastStepButtonText = "Preview",
    launchButtonText = "Launch App",
    showLaunchButton = false,
}) => {
    const footerButtons = currentStepCompletion?.footerButtons;
    const statusMessage = currentStepCompletion?.message;
    const isFinalStep = activeStep === totalSteps - 1;

    // Determine which button text to use based on the step
    const getNextButtonText = () => {
        if (isFinalStep) return finalStepButtonText;
        if (activeStep === totalSteps - 2) return secondToLastStepButtonText;
        return nextButtonText;
    };

    // Check if next button should be disabled
    const isNextDisabled = 
        isFinalStep || 
        isLoading || 
        !selectedAppId || 
        !currentStepCompletion?.canProceed;

    return (
        <CardFooter className="flex flex-col space-y-4 md:space-y-0 pb-6">
            {/* Status Message - Show at top on mobile, middle on desktop */}
            {statusMessage && (
                <div className="w-full md:hidden">
                    <p className={`text-sm text-center ${!currentStepCompletion?.canProceed ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {statusMessage}
                    </p>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row w-full space-y-3 md:space-y-0">
                {/* Back/Reset Buttons */}
                <div className="w-full md:w-1/3 flex items-center justify-center md:justify-start">
                    {activeStep > 0 ? (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={onBack}
                                disabled={isLoading}
                                className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                {backButtonText}
                            </Button>
                            {activeStep > 0 && (
                                <Button
                                    variant="ghost"
                                    onClick={onReset}
                                    disabled={isLoading}
                                    size="sm"
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700"
                                >
                                    {resetButtonText}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div></div>
                    )}
                </div>
    
                {/* Status Message - Hidden on mobile, visible on desktop */}
                <div className="hidden md:flex md:w-1/3 justify-center items-center">
                    {statusMessage && (
                        <p className={`text-sm ${!currentStepCompletion?.canProceed ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                            {statusMessage}
                        </p>
                    )}
                </div>
    
                {/* Action Buttons */}
                <div className="w-full md:w-1/3 flex justify-center md:justify-end gap-2 items-center">
                    {/* Additional button area - render any step-specific buttons */}
                    {footerButtons}
                    
                    {/* Show Launch button in final step if requested */}
                    {isFinalStep && showLaunchButton && onLaunchApp && !isLoading && (
                        <HoverBorderGradient
                            containerClassName="rounded-xl"
                            as="button"
                            onClick={onLaunchApp}
                            className="dark:bg-gray-900 bg-white px-4 flex items-center space-x-2"
                        >
                            <span className="text-sm">{launchButtonText}</span>
                            <Rocket className="h-4 w-4 text-gray-800 dark:text-gray-200" />
                        </HoverBorderGradient>
                    )}
                    
                    {!isNextDisabled ? (
                        <HoverBorderGradient
                            containerClassName="rounded-xl"
                            as="button"
                            onClick={onNext}
                            className="dark:bg-gray-900 bg-white px-10 flex items-center space-x-2"
                        >
                            <span >{getNextButtonText()}</span>
                            <ArrowBigRight className="h-6 w-6 ml-1 text-gray-800 dark:text-gray-200" />
                        </HoverBorderGradient>
                    ) : (
                        <Button
                            onClick={onNext}
                            disabled={true}
                            className="bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        >
                            {getNextButtonText()}
                        </Button>
                    )}
                </div>
            </div>
        </CardFooter>
    );
};

export default StepperFooter;
