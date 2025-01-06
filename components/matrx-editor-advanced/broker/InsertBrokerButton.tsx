"use client";

import React, { useCallback } from "react";
import { Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditorBroker } from "../types";
import { useBrokerSync } from '@/providers/brokerSync/BrokerSyncProvider';
import { useRefManager } from '@/lib/refs';

interface InsertBrokerButtonProps {
  editorId: string;  // Add editorId prop
  onBrokerCreate?: (broker: EditorBroker) => void;
}

export const InsertBrokerButton: React.FC<InsertBrokerButtonProps> = ({
  editorId,
  onBrokerCreate,
}) => {
  const refManager = useRefManager();
  const { initializeBroker } = useBrokerSync();

  const handleClick = useCallback(async () => {
    const stringValue = '';
    const displayName = 'New Broker';
    const brokerId = await initializeBroker(editorId, displayName, stringValue);
    const broker: EditorBroker = {
      id: brokerId,
      displayName,
      progressStep: 'tempRequested' as const,
      stringValue,
      editorId,
      isConnected: false
    };
    
    refManager.call(editorId, 'insertBroker', { ...broker, id: brokerId });

    onBrokerCreate?.(broker);
  }, [editorId, initializeBroker, refManager, onBrokerCreate]);

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