'use client';

import React from "react";
import { Button } from "@/components/ui";
import { X, MessageCircleQuestion, Blocks, CheckCircle2, XCircle, ChevronUp, ChevronDown } from "lucide-react";
import { getComponentIcon, getSourceIcon } from "@/app/(authenticated)/tests/recipe-creation/brokers-two/constants";
import { cn } from "@/utils";

const BrokerHeader = ({ 
  data, 
  isOpen, 
  onToggle, 
  onDelete 
}) => {
  return (
    <div
      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-elevation3/50 transition-colors"
      onClick={onToggle}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-md bg-elevation2/50">
          {data.componentType ? (
            getComponentIcon(data.componentType)
          ) : (
            <MessageCircleQuestion className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
        <span className="font-medium text-sm truncate">
          {data.displayName || "Unnamed Broker"}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className="h-6 w-6 flex items-center justify-center rounded-md bg-elevation2/50"
          title={data.defaultSource}
        >
          {data.defaultSource ? (
            getSourceIcon(data.defaultSource)
          ) : (
            <Blocks className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>

        <div
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded-md",
            data.isConnected
              ? "bg-success/10 text-success"
              : "bg-elevation2/50"
          )}
          title={data.isConnected ? "Connected" : "Disconnected"}
        >
          {data.isConnected ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>

        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </div>
  );
};

export default BrokerHeader;