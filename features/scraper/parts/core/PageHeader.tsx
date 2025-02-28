"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, ExternalLinkIcon } from "lucide-react";

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
    <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-indigo-700/30 backdrop-blur-sm"></div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight truncate">
              {title || "Untitled Page"}
            </h1>
            {url && (
              <div className="flex items-center">
                <ExternalLinkIcon className="text-white/80 mr-2 h-4 w-4" />
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white underline decoration-1 underline-offset-4 text-sm"
                >
                  {url || "No URL"}
                </a>
              </div>
            )}
          </div>
          <Badge className={`text-sm px-3 py-1 ${status === "success" ? "bg-green-500/90 hover:bg-green-500" : "bg-red-500/90 hover:bg-red-500"}`}>
            {status}
          </Badge>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-4">
          <TooltipProvider>
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch 
                  id="keyword-analysis-toggle" 
                  checked={featureToggles.keywordAnalysis}
                  onCheckedChange={() => handleToggleChange('keywordAnalysis')}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className="text-white font-medium text-sm">
                  Keyword Analysis
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-white/70 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="w-48">Enable keyword analysis feature</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <TooltipProvider>
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch 
                  id="fact-checker-toggle" 
                  checked={featureToggles.factChecker}
                  onCheckedChange={() => handleToggleChange('factChecker')}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className="text-white font-medium text-sm">
                  Fact Checker
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-white/70 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="w-48">Enable fact checking feature</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;