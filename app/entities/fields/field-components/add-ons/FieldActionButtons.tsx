import React, { useState, useCallback } from "react";
import { Copy, Check, RotateCcw, History, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ControlledTooltip from "./ControlledTooltip";

export interface FieldActionButtonsProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateValue?: () => string;
  generateIcon?: React.ReactNode;
  generateTooltip?: string;
  disabled?: boolean;
  maxHistory?: number;
  className?: string;
  allowClear?: boolean;
  onShowTooltip?: (text: string) => void;
  onHideTooltip?: () => void;
}

const FieldActionButtons = ({
  value,
  onChange,
  onGenerateValue,
  generateIcon,
  generateTooltip = "Generate",
  disabled = false,
  maxHistory = 5,
  className = "",
  allowClear = true,
  onShowTooltip,
  onHideTooltip
}: FieldActionButtonsProps) => {
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [localTooltipText, setLocalTooltipText] = useState("");
  const [showLocalTooltip, setShowLocalTooltip] = useState(false);

  // Handle tooltips with both local and external control
  const handleShowTooltip = (text: string) => {
    if (onShowTooltip) {
      onShowTooltip(text);
    } else {
      setLocalTooltipText(text);
      setShowLocalTooltip(true);
    }
  };

  const handleHideTooltip = () => {
    if (onHideTooltip) {
      onHideTooltip();
    } else {
      setShowLocalTooltip(false);
    }
  };

  const ActionButton = useCallback(
    ({
      onClick,
      tooltip,
      icon,
      buttonDisabled = disabled,
    }: {
      onClick: () => void;
      tooltip: string;
      icon: React.ReactNode;
      buttonDisabled?: boolean;
    }) => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onClick}
        disabled={buttonDisabled}
        onMouseEnter={() => handleShowTooltip(tooltip)}
        onMouseLeave={handleHideTooltip}
      >
        {icon}
      </Button>
    ),
    [disabled]
  );

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleGenerate = () => {
    if (onGenerateValue) {
      const newValue = onGenerateValue();
      addToHistory(value);
      onChange(newValue);
    }
  };

  const handleClear = () => {
    if (value) {
      addToHistory(value);
      onChange("");
    }
  };

  const addToHistory = (valueToAdd: string) => {
    if (valueToAdd) {
      setHistory((prev) =>
        [valueToAdd, ...prev.filter((v) => v !== valueToAdd)].slice(0, maxHistory)
      );
    }
  };

  const restoreFromHistory = (historicValue: string) => {
    if (value !== historicValue) {
      addToHistory(value);
      onChange(historicValue);
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-0.5 ${className}`}>
      {/* Only render the local tooltip if no external control is provided */}
      {!onShowTooltip && (
        <ControlledTooltip 
          text={localTooltipText}
          show={showLocalTooltip}
          onHide={() => setShowLocalTooltip(false)}
        />
      )}

      {onGenerateValue && (
        <ActionButton
          onClick={handleGenerate}
          tooltip={generateTooltip}
          icon={generateIcon}
        />
      )}

      {value && (
        <>
          <ActionButton
            onClick={copyToClipboard}
            tooltip="Copy to clipboard"
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            buttonDisabled={false}
          />

          {allowClear && (
            <ActionButton
              onClick={handleClear}
              tooltip="Clear"
              icon={<Trash className="h-4 w-4" />}
            />
          )}
        </>
      )}

      <DropdownMenu>
        <div
          onMouseEnter={() => handleShowTooltip("History")}
          onMouseLeave={handleHideTooltip}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={disabled || history.length === 0}
            >
              <History className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent
          align="end"
          className="w-[300px]"
        >
          {history.map((item, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => restoreFromHistory(item)}
              className="flex justify-between items-center font-mono"
            >
              <span className="truncate">{item}</span>
              <RotateCcw className="h-3 w-3 ml-2 flex-shrink-0" />
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setHistory([])}
            className="text-destructive"
          >
            Clear History
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default React.memo(FieldActionButtons);