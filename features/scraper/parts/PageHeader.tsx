"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

/**
 * Component for displaying the page header with title, URL, status, and feature toggles
 */
const PageHeader = ({ 
  title, 
  url, 
  status, 
  featureToggles = { 
    keywordAnalysis: false, 
    factChecker: false 
  }, 
  setFeatureToggles 
}) => {
  const handleToggleChange = (feature) => {
    setFeatureToggles((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center p-4">
        <div>
          <h1 className="text-2xl font-bold truncate dark:text-white text-gray-800">
            {title || "Untitled Page"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">{url || "No URL"}</p>
        </div>
        <Badge className={status === "success" ? "bg-green-500 dark:bg-green-600" : "bg-red-500 dark:bg-red-600"}>
          {status}
        </Badge>
      </div>
      
      <div className="px-4 pb-3 flex items-center gap-6">
        <TooltipProvider>
          <div className="flex items-center space-x-2">
            <Switch 
              id="keyword-analysis-toggle" 
              checked={featureToggles.keywordAnalysis}
              onCheckedChange={() => handleToggleChange('keywordAnalysis')}
            />
            <Label htmlFor="keyword-analysis-toggle" className="text-sm font-medium cursor-pointer">
              Keyword Analysis
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-gray-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-64">Enable to Keyword Analysis.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <TooltipProvider>
          <div className="flex items-center space-x-2">
            <Switch 
              id="fact-checker-toggle" 
              checked={featureToggles.factChecker}
              onCheckedChange={() => handleToggleChange('factChecker')}
            />
            <Label htmlFor="fact-checker-toggle" className="text-sm font-medium cursor-pointer">
              Fact Checker
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-gray-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-64">Enable to Fact Checker.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default PageHeader;