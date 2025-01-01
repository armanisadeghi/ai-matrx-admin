"use client";

import React, { useCallback } from "react";
import { Variable, Highlighter } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBrokers, type Broker } from "@/providers/brokers/BrokersProvider";

interface SmartBrokerButtonProps {
  onBrokerCreate: (broker: Broker) => void;
  onBrokerConvert: (broker: Broker) => void;
  getSelectedText: () => string | null;
}

export const SmartBrokerButton: React.FC<SmartBrokerButtonProps> = ({
  onBrokerCreate,
  onBrokerConvert,
  getSelectedText,
}) => {
  const { createBroker, convertSelectionToBroker } = useBrokers();
  const selectedText = getSelectedText?.();
  const hasSelection = Boolean(selectedText);

  const handleClick = useCallback(() => {
    if (hasSelection) {
      const text = getSelectedText?.() || window.getSelection()?.toString();
      if (text) {
        const broker = convertSelectionToBroker(text);
        onBrokerConvert(broker);
      }
    } else {
      const broker = createBroker();
      onBrokerCreate(broker);
    }
  }, [createBroker, convertSelectionToBroker, hasSelection, getSelectedText, onBrokerCreate, onBrokerConvert]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="h-10 w-10 flex items-center justify-center cursor-pointer rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={handleClick}
        >
          {hasSelection ? (
            <Highlighter 
              className="h-6 w-6 transition-transform hover:scale-110" 
            />
          ) : (
            <Variable 
              className="h-6 w-6 transition-transform hover:scale-110" 
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {hasSelection ? "Convert Selection to Broker" : "Insert New Broker"}
      </TooltipContent>
    </Tooltip>
  );
};

export default SmartBrokerButton;