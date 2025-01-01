"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModelSettings from "./ModelSettings";
import PlaygroundResources from "../right-sidebar/PlaygroundResources";
import MetricsCard from "./MetricsCard";
import { useMeasure } from "@uidotdev/usehooks";

const ModelSettingsPanel = (initialSettings) => {
  const [ref, { width }] = useMeasure();
  const [activeTab, setActiveTab] = useState("model1");
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    setIsNarrow(width < 175);
  }, [width]);

  return (
    <div className="h-full flex flex-col bg-background" ref={ref}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full rounded-none">
        <TabsList className="w-full grid grid-cols-4 rounded-none bg-elevation2 p-0.5 gap-px">
          {[1, 2, 3, 4].map((num) => (
            <TabsTrigger
              key={num}
              value={`model${num}`}
              className={`
                text-sm font-medium rounded-none
                px-1 py-1.5
                data-[state=active]:bg-primary 
                data-[state=active]:text-primary-foreground
                border-r border-border/30
                last:border-r-0
                transition-colors
                hover:bg-muted/50
                data-[state=active]:shadow-sm
              `}
            >
              {isNarrow ? `S${num}` : `Set ${num}`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="p-2 space-y-4">
        <ModelSettings initialSettings={initialSettings} />
      </div>

      <div className="mt-auto">
        <PlaygroundResources />
        <MetricsCard />
      </div>
    </div>
  );
};

export default ModelSettingsPanel;