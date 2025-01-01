"use client";

import React, { useCallback } from "react";
import { Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBrokers, type Broker } from "@/providers/brokers/BrokersProvider";

interface InsertBrokerButtonProps {
  onBrokerCreate?: (broker: Broker) => void;
}

export const InsertBrokerButton: React.FC<InsertBrokerButtonProps> = ({
  onBrokerCreate,
}) => {
  const { createBroker } = useBrokers();

  const handleClick = useCallback(() => {
    const broker = createBroker();
    onBrokerCreate?.(broker);
  }, [createBroker, onBrokerCreate]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClick}
        >
          <Variable className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Insert New Broker</TooltipContent>
    </Tooltip>
  );
};

export default InsertBrokerButton;