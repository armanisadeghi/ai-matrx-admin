"use client";

import React from "react";
import BraveSearchDisplay from "@/features/workflows/results/registered-components/BraveSearchDisplay";

/**
 * Registry of custom components for different step_data types
 * Add new components here as needed
 */
export const stepDataRegistry: Record<string, React.ComponentType<{ data: any }>> = {
    "brave_default_page": BraveSearchDisplay,
    // Add more components here as you create them:
    // "another_step_type": AnotherStepComponent,
};

/**
 * Check if a custom component is registered for a given step type
 */
export const hasRegisteredComponent = (stepType: string): boolean => {
    return stepType in stepDataRegistry;
};

/**
 * Get the registered component for a step type
 */
export const getRegisteredComponent = (stepType: string): React.ComponentType<{ data: any }> | null => {
    return stepDataRegistry[stepType] || null;
};

