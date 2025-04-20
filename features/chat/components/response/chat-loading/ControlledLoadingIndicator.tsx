"use client";
import React, { useState, useEffect, useRef } from "react";
import WebSearch from "./WebSearch";
import AudioProcessing from "./AudioProcessing";
import DocumentReading from "./DocumentReading";
import BrainActivity from "./BrainActivity";
import PlanCreation from "./PlanCreation";
import QuestionGenerating from "./QuestionGenerating";
import ExpertConnecting from "./ExpertConnecting";
import FinalProcessing from "./FinalProcessing";
import QuickResponse from "./QuickResponse";
import LongProcess from "./LongProcess";
import RecipeProcessing from "./RecipeProcessing";

export interface InputControlsSettings {
    searchEnabled: boolean;
    toolsEnabled: boolean;
    thinkEnabled: boolean;
    researchEnabled: boolean;
    recipesEnabled: boolean;
    planEnabled: boolean;
    audioEnabled: boolean;
    enableAskQuestions: boolean;
    enableBrokers: boolean;
    hasFiles: boolean;
    generateImages: boolean;
    generateVideos: boolean;
}

type AnimationType =
    | "thinking"
    | "circular"
    | "bouncing"
    | "flipping"
    | "growing"
    | "blinking"
    | "waving"
    | "rotating"
    | "swinging"
    | "spinner"
    | "webSearch"
    | "audioProcessing"
    | "documentReading"
    | "brainActivity"
    | "planCreation"
    | "questionGenerating"
    | "expertConnecting"
    | "finalProcessing"
    | "recipeSearch";

export const FEATURE_CONFIG = {
    thinkEnabled: {
        steps: [{ message: "Thinking...", type: "brainActivity" as AnimationType, displayTime: 1000 }],
    },
    searchEnabled: {
        steps: [
            { message: "Searching the web...", type: "webSearch" as AnimationType, displayTime: 2000 },
            { message: "Analyzing web results...", type: "documentReading" as AnimationType, displayTime: 2000 },
        ],
    },
    toolsEnabled: {
        steps: [
            { message: "Using tools...", type: "circular" as AnimationType, displayTime: 1000 },
            { message: "Analyzing results...", type: "documentReading" as AnimationType, displayTime: 1000 },
        ],
    },
    researchEnabled: {
        steps: [{ message: "Researching...", type: "documentReading" as AnimationType, displayTime: 1000 }],
    },
    recipesEnabled: {
        steps: [{ message: "Finding recipes...", type: "recipeSearch" as AnimationType, displayTime: 1000 }],
    },
    planEnabled: {
        steps: [
            { message: "Transcribing audio...", type: "audioProcessing" as AnimationType, displayTime: 1000 },
            { message: "Analyzing audio content...", type: "brainActivity" as AnimationType, displayTime: 1000 },
            { message: "Creating plan...", type: "expertConnecting" as AnimationType, displayTime: 1000 },
            { message: "Generating Tasks...", type: "planCreation" as AnimationType, displayTime: 1000 },
            { message: "Finalizing...", type: "finalProcessing" as AnimationType, displayTime: 1000 },
        ],
    },
    audioEnabled: {
        steps: [
            { message: "Transcribing audio...", type: "audioProcessing" as AnimationType, displayTime: 1000 },
            { message: "Analyzing audio content...", type: "brainActivity" as AnimationType, displayTime: 1000 },
        ],
    },
    enableAskQuestions: {
        steps: [{ message: "Formulating questions...", type: "questionGenerating" as AnimationType, displayTime: 1000 }],
    },
    enableBrokers: {
        steps: [{ message: "Getting your custom data...", type: "expertConnecting" as AnimationType, displayTime: 1000 }],
    },
    hasFiles: {
        steps: [
            { message: "Processing files...", type: "documentReading" as AnimationType, displayTime: 1000 },
            { message: "Analyzing file content...", type: "brainActivity" as AnimationType, displayTime: 1000 },
        ],
    },
    generateImages: {
        steps: [
            { message: "Generating images...", type: "circular" as AnimationType, displayTime: 1500 },
            { message: "Refining images...", type: "brainActivity" as AnimationType, displayTime: 1000 },
        ],
    },
    generateVideos: {
        steps: [
            { message: "Generating video frames...", type: "circular" as AnimationType, displayTime: 1500 },
            { message: "Processing video...", type: "brainActivity" as AnimationType, displayTime: 1000 },
            { message: "Finalizing video...", type: "finalProcessing" as AnimationType, displayTime: 1000 },
        ],
    },
};

const FINAL_STEP = {
    message: "",
    type: "finalProcessing" as AnimationType,
    displayTime: 2000,
};

interface LoadingIndicatorProps {
    settings?: InputControlsSettings | null;
    className?: string;
    defaultDisplayTime?: number;
}

interface Step {
    message: string;
    type: AnimationType;
    displayTime?: number;
}

interface FeatureStep {
    featureKey: keyof InputControlsSettings;
    step: Step;
    stepIndex: number;
    totalSteps: number;
}

const DEFAULT_SETTINGS: InputControlsSettings = {
    searchEnabled: false,
    toolsEnabled: false,
    thinkEnabled: false,
    researchEnabled: false,
    recipesEnabled: false,
    planEnabled: false,
    audioEnabled: false,
    enableAskQuestions: false,
    enableBrokers: false,
    hasFiles: false,
    generateImages: false,
    generateVideos: false,
};

const ControlledLoadingIndicator: React.FC<LoadingIndicatorProps> = ({ settings, className = "", defaultDisplayTime = 1000 }) => {
    // Use a simple counter to force complete re-rendering when settings change
    const [renderKey, setRenderKey] = useState<number>(0);

    // Keep a reference to the current settings to detect changes
    const settingsRef = useRef<string>("");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [allSteps, setAllSteps] = useState<FeatureStep[]>([]);
    const [showFinalStep, setShowFinalStep] = useState(false);

    // Convert settings to a string for comparison
    const settingsString = JSON.stringify(settings);

    // Debug function to log all enabled settings
    const logEnabledSettings = (normalizedSettings: InputControlsSettings) => {
        const enabled = Object.entries(normalizedSettings)
            .filter(([_, value]) => value === true)
            .map(([key]) => key);
        return enabled;
    };

    const normalizeSettings = (): InputControlsSettings => {
        if (!settings) return { ...DEFAULT_SETTINGS };
        const normalizedSettings: InputControlsSettings = { ...DEFAULT_SETTINGS };
        Object.keys(DEFAULT_SETTINGS).forEach((key) => {
            const typedKey = key as keyof InputControlsSettings;
            if (settings[typedKey] === true) {
                normalizedSettings[typedKey] = true;
            }
        });
        return normalizedSettings;
    };

    // Complete reset when settings change
    useEffect(() => {
        if (settingsRef.current !== settingsString) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            // Update the ref
            settingsRef.current = settingsString;

            // Force a complete re-render by incrementing the key
            setRenderKey((prev) => prev + 1);

            // Reset state
            setCurrentStepIndex(0);
            setShowFinalStep(false);

            // Build steps based on new settings
            const normalizedSettings = normalizeSettings();
            const enabledSettings = logEnabledSettings(normalizedSettings);

            const steps: FeatureStep[] = [];
            let hasEnabledFeatures = false;

            // Get all enabled features that have configuration
            Object.keys(normalizedSettings).forEach((key) => {
                const typedKey = key as keyof InputControlsSettings;
                const isEnabled = normalizedSettings[typedKey];

                // Check if this key exists in FEATURE_CONFIG
                if (isEnabled && typedKey in FEATURE_CONFIG) {
                    hasEnabledFeatures = true;
                    const configKey = typedKey as keyof typeof FEATURE_CONFIG;
                    const featureSteps = FEATURE_CONFIG[configKey].steps;

                    featureSteps.forEach((step, stepIndex) => {
                        steps.push({
                            featureKey: typedKey,
                            step,
                            stepIndex,
                            totalSteps: featureSteps.length,
                        });
                    });
                }
            });

            setAllSteps(steps);

            // If no features are enabled, immediately show final step
            if (!hasEnabledFeatures) {
                setShowFinalStep(true);
            }
        }
    }, [settingsString]);

    // Handle cycling through steps
    useEffect(() => {
        // Ignore if we're showing the final step already
        if (showFinalStep) {
            return () => {};
        }

        // If no steps, show final step
        if (allSteps.length === 0) {
            setShowFinalStep(true);
            return () => {};
        }

        // Check for valid index
        if (currentStepIndex >= allSteps.length) {
            setCurrentStepIndex(0);
            return () => {};
        }

        // Get current step and set timer for next step
        const currentStep = allSteps[currentStepIndex];
        const displayTime = currentStep.step.displayTime || defaultDisplayTime;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Set timer for next step
        timerRef.current = setTimeout(() => {
            if (currentStepIndex < allSteps.length - 1) {
                setCurrentStepIndex((prev) => prev + 1);
            } else {
                setShowFinalStep(true);
            }
        }, displayTime);

        // Cleanup timer on unmount or before next effect run
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [currentStepIndex, showFinalStep, allSteps, defaultDisplayTime]);

    // Generate the current step data
    const getCurrentStep = () => {
        // If showing final step or no steps available, return the final step
        if (showFinalStep || allSteps.length === 0) {
            return {
                step: FINAL_STEP,
                totalSteps: 1,
                stepIndex: 0,
            };
        }

        // Safety check for index
        if (currentStepIndex >= allSteps.length) {
            console.warn("Invalid step index, using final step");
            return {
                step: FINAL_STEP,
                totalSteps: 1,
                stepIndex: 0,
            };
        }

        // Return the current step data
        return {
            step: allSteps[currentStepIndex].step,
            totalSteps: allSteps[currentStepIndex].totalSteps,
            stepIndex: allSteps[currentStepIndex].stepIndex,
        };
    };

    const { step, totalSteps, stepIndex } = getCurrentStep();

    const getStepIndicator = () => {
        if (totalSteps <= 1) return "";
        return ` (${stepIndex + 1}/${totalSteps})`;
    };

    const renderComponent = () => {
        const message = `${step.message}${getStepIndicator()}`;
        const componentKey = `${step.type}-${message}-${renderKey}`;

        try {
            switch (step.type) {
                case "webSearch":
                    return <WebSearch key={componentKey} message={message} />;
                case "audioProcessing":
                    return <AudioProcessing key={componentKey} message={message} />;
                case "documentReading":
                    return <DocumentReading key={componentKey} message={message} />;
                case "brainActivity":
                    return <BrainActivity key={componentKey} message={message} />;
                case "planCreation":
                    return <PlanCreation key={componentKey} message={message} />;
                case "questionGenerating":
                    return <QuestionGenerating key={componentKey} message={message} />;
                case "expertConnecting":
                    return <ExpertConnecting key={componentKey} message={message} />;
                case "finalProcessing":
                    return <FinalProcessing key={componentKey} message={message} />;
                case "recipeSearch":
                    return <RecipeProcessing key={componentKey} message={message} />;
                case "thinking":
                    return <QuickResponse key={componentKey} message={message} />;
                case "circular":
                    return <LongProcess key={componentKey} message={message} />;
                default:
                    console.log("⚠️ Unknown animation type:", step.type);
                    return <div key={componentKey}>{message}</div>;
            }
        } catch (error) {
            console.error("Error rendering component:", error);
            return <div key={componentKey}>{message}</div>;
        }
    };

    return <div className={className}>{renderComponent()}</div>;
};

export default ControlledLoadingIndicator;
