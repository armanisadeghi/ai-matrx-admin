"use client";
import React from "react";
import { Badge, Switch } from "@ai-matrx/design-system/controls";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon, ExternalLinkIcon } from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface FeatureToggles {
  keywordAnalysis: boolean;
  factChecker: boolean;
}

interface PageHeaderProps {
  title?: string | null;
  url?: string | null;
  status?: string;
  featureToggles?: FeatureToggles;
  setFeatureToggles: React.Dispatch<React.SetStateAction<FeatureToggles>>;
}

function FeatureToggle({
  id,
  label,
  help,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Switch id={id} checked={checked} onCheckedChange={onToggle} />
        <span className="type-secondary text-muted-foreground whitespace-nowrap">
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="w-40 type-secondary">{help}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

const PageHeader = ({
  title,
  url,
  status,
  featureToggles = {
    keywordAnalysis: false,
    factChecker: false,
  },
  setFeatureToggles,
}: PageHeaderProps) => {
  const handleToggleChange = (feature: keyof FeatureToggles) => {
    setFeatureToggles((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  return (
    <div className="bg-card rounded-t-lg overflow-hidden border border-border">
      <div className="px-4 py-3 relative">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="type-title text-foreground truncate">
                {title || "Untitled Page"}
              </h1>
              {url && (
                <div className="flex items-center mt-0.5 min-w-0">
                  <ExternalLinkIcon className="text-muted-foreground mr-1.5 h-3 w-3 shrink-0" />
                  <OutboundLink
                    href={url}
                    className="type-secondary text-muted-foreground hover:text-foreground truncate"
                  >
                    {url || "No URL"}
                  </OutboundLink>
                </div>
              )}
            </div>
            {/* No status reported (a stored Source, a result envelope without
                one): no badge — never an empty red pill that reads as failure. */}
            {status ? (
            <Badge
              tone={status === "success" ? "success" : "destructive"}
              className="ml-2 shrink-0"
            >
              {status}
            </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <FeatureToggle
              id="keyword-analysis-toggle"
              label="Keyword Analysis"
              help="Enable keyword analysis feature"
              checked={featureToggles.keywordAnalysis}
              onToggle={() => handleToggleChange("keywordAnalysis")}
            />
            <FeatureToggle
              id="fact-checker-toggle"
              label="Fact Checker"
              help="Enable fact checking feature"
              checked={featureToggles.factChecker}
              onToggle={() => handleToggleChange("factChecker")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
