"use client";
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Component shown when a feature is disabled, providing an option to enable it
 */
const FeatureDisabledPlaceholder = ({ 
  featureName, 
  description, 
  onEnable
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 max-w-md">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">{featureName} is disabled</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {description || `This feature is currently turned off to save on API costs. Enable it to see the analysis.`}
        </p>
        <Button 
          onClick={onEnable}
          className="bg-primary hover:bg-primary/90"
        >
          Enable {featureName}
        </Button>
      </div>
    </div>
  );
};

export default FeatureDisabledPlaceholder;