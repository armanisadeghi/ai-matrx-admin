"use client";

import React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppletData } from "@/context/AppletDataContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { HeaderExtraButtonsConfig } from "../field-components/types";
import { useDispatch } from "react-redux";
import { useToast } from "@/components/ui/use-toast";

// Import the handler functions
import { renderChat, changeApplet, renderModal, renderSampleApplet } from "./HeaderButtons";

interface ButtonMenuProps {
  className?: string;
  buttons: HeaderExtraButtonsConfig[];
}

export function ButtonMenu({ className, buttons }: ButtonMenuProps) {
  const { accentColor } = useAppletData();
  const dispatch = useDispatch();
  const { toast } = useToast();
  
  // Handle knownMethod executions
  const handleKnownMethod = (button: HeaderExtraButtonsConfig) => {
    if (!button.knownMethod || button.knownMethod === "none") return;
    
    switch (button.knownMethod) {
      case "renderChat":
        renderChat(button, toast);
        break;
      case "changeApplet":
        changeApplet(button, toast);
        break;
      case "renderModal":
        renderModal(button, toast);
        break;
      case "renderSampleApplet":
        renderSampleApplet(button, toast);
        break;
      default:
        console.warn(`Unknown knownMethod: ${button.knownMethod}`);
    }
  };
  
  // Skip rendering if no buttons
  if (!buttons || buttons.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100", 
            className
          )}
          aria-label="Menu Options"
        >
          <MoreHorizontal size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {buttons.map((button) => {
          const handleClick = () => {
            // Handle different action types
            if (button.actionType === "redux" && button.reduxAction) {
              dispatch({ type: button.reduxAction, payload: {} });
            }
            
            // Execute custom onClick if provided
            if (button.onClick) button.onClick();
            
            // Execute known method
            handleKnownMethod(button);
          };
          
          return (
            <DropdownMenuItem
              key={button.label}
              className="flex items-center py-1.5 cursor-pointer"
              onClick={handleClick}
            >
              {button.icon && <span className="mr-2">{button.icon}</span>}
              <span className="text-sm">{button.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ButtonMenu; 