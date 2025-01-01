"use client";

import React, { useCallback } from "react";
import { Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBrokers, type Broker } from "@/providers/brokers/BrokersProvider";

interface ConvertBrokerButtonProps {
  selectedText: string | null;
  onBrokerConvert?: (broker: Broker) => void;
}

export const ConvertBrokerButton: React.FC<ConvertBrokerButtonProps> = ({
  selectedText,
  onBrokerConvert,
}) => {
  const { convertSelectionToBroker } = useBrokers();

  const handleClick = useCallback(() => {
    if (selectedText) {
      const broker = convertSelectionToBroker(selectedText);
      onBrokerConvert?.(broker);
    }
  }, [convertSelectionToBroker, selectedText, onBrokerConvert]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", !selectedText && "opacity-50")}
          onClick={handleClick}
          disabled={!selectedText}
        >
         <Highlighter  className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Convert To Broker</TooltipContent>
    </Tooltip>
  );
};

export default ConvertBrokerButton;