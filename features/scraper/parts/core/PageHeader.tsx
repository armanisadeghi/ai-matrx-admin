"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, ExternalLinkIcon } from "lucide-react";



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
    <div className="bg-slate-800 rounded-t-lg shadow-md overflow-hidden border border-slate-700">
      <div className="px-4 py-3 relative">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-white truncate">
                {title || "Untitled Page"}
              </h1>
              {url && (
                <div className="flex items-center mt-0.5">
                  <ExternalLinkIcon className="text-slate-400 mr-1.5 h-3 w-3" />
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    {url || "No URL"}
                  </a>
                </div>
              )}
            </div>
            <Badge className={`ml-2 text-xs px-2 py-0.5 ${
              status === "success" 
                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30" 
                : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
            }`}>
              {status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <div className="flex items-center">
                <div className="flex items-center gap-2 bg-slate-800/60 rounded-md px-2 py-1">
                  <Switch 
                    id="keyword-analysis-toggle" 
                    checked={featureToggles.keywordAnalysis}
                    onCheckedChange={() => handleToggleChange('keywordAnalysis')}
                    className="data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-slate-700 h-4 w-7"
                  />
                  <span className="text-slate-300 text-xs whitespace-nowrap">
                    Keyword Analysis
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-3 w-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-slate-800 text-slate-200 border-slate-700">
                      <p className="w-40 text-xs">Enable keyword analysis feature</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
            
            <TooltipProvider>
              <div className="flex items-center">
                <div className="flex items-center gap-2 bg-slate-800/60 rounded-md px-2 py-1">
                  <Switch 
                    id="fact-checker-toggle" 
                    checked={featureToggles.factChecker}
                    onCheckedChange={() => handleToggleChange('factChecker')}
                    className="data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-slate-700 h-4 w-7"
                  />
                  <span className="text-slate-300 text-xs whitespace-nowrap">
                    Fact Checker
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-3 w-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-slate-800 text-slate-200 border-slate-700">
                      <p className="w-40 text-xs">Enable fact checking feature</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;