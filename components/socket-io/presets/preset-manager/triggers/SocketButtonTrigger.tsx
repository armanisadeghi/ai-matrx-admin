"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Zap } from "lucide-react";
import { SocketPresetTriggerProps } from "../SocketPresetManager";

export interface SocketButtonTriggerProps extends SocketPresetTriggerProps {
  // UI customization
  buttonText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * A simple button trigger for socket preset execution
 */
export const SocketButtonTrigger: React.FC<SocketButtonTriggerProps> = ({
  config,
  onExecute,
  isExecuting = false,
  buttonText = "Execute",
  variant = "default",
  size = "default",
  className,
}) => {
  const handleClick = () => {
    onExecute(config.sourceData);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isExecuting}
      variant={variant}
      size={size}
      className={className}
    >
      {isExecuting ? (
        <>
          <Zap className="w-4 h-4 mr-2 animate-spin" />
          Executing...
        </>
      ) : (
        <>
          <Play className="w-4 h-4 mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

export default SocketButtonTrigger; 