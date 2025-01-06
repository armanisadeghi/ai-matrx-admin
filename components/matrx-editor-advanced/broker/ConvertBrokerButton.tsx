"use client";

import React, { useCallback } from "react";
import { Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditorBroker } from "../types";
import { useBrokerSync } from '@/providers/brokerSync/BrokerSyncProvider';
import { useRefManager } from '@/lib/refs';
import { generateBrokerName } from '../utils/generateBrokerName';

interface ConvertBrokerButtonProps {
  editorId: string;
  selectedText: string | null;
  onBrokerConvert?: (broker: EditorBroker) => void;
}

export const ConvertBrokerButton: React.FC<ConvertBrokerButtonProps> = ({
  editorId,
  selectedText,
  onBrokerConvert,
}) => {
  const refManager = useRefManager();
  const { initializeBroker } = useBrokerSync();

  const handleClick = useCallback(async () => {
    if (!selectedText) return;

    const displayName = generateBrokerName(selectedText);
    const stringValue = selectedText;
    const brokerId = await initializeBroker(editorId, displayName, stringValue);

    const broker: EditorBroker = {
      id: brokerId,
      displayName,
      stringValue,
      editorId,
      isConnected: false,
      progressStep: 'tempRequested' as const,
    };

    refManager.call(editorId, 'convertToBroker', { ...broker, id: brokerId });
    onBrokerConvert?.(broker);
  }, [editorId, selectedText, initializeBroker, refManager, onBrokerConvert]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClick}
          disabled={!selectedText}
        >
          <Highlighter className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Convert Selection to Broker</TooltipContent>
    </Tooltip>
  );
};

export default ConvertBrokerButton;