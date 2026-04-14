import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calcCols } from "./useContainerColumns";

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  variableName: string;
  allowOther?: boolean;
  compact?: boolean;
  wizardMode?: boolean;
  /** Show all options as clickable buttons instead of a dropdown */
  expanded?: boolean;
  /** Auto-wrap buttons into columns based on available container width */
  wrap?: boolean;
  containerWidth?: number;
}

/**
 * Select Input — dropdown by default, or a button list when expanded=true.
 */
export function SelectInput({
  value,
  onChange,
  options,
  variableName,
  allowOther = false,
  compact = false,
  wizardMode,
  expanded = false,
  wrap = true,
  containerWidth = 0,
}: SelectInputProps) {
  const isOtherValue = value.startsWith("Other: ");
  const otherText = isOtherValue ? value.substring(7) : "";
  const isValueInOptions = options.includes(value);

  const [selectedOption, setSelectedOption] = useState<string>(() => {
    if (isValueInOptions) return value;
    if (isOtherValue) return "Other";
    return value;
  });

  const [customText, setCustomText] = useState<string>(otherText);

  const cols = calcCols(
    containerWidth,
    options,
    expanded ? wrap : false,
    compact,
  );

  useEffect(() => {
    if (isValueInOptions) {
      setSelectedOption(value);
      setCustomText("");
    } else if (isOtherValue) {
      setSelectedOption("Other");
      setCustomText(value.substring(7));
    } else {
      setSelectedOption(value);
    }
  }, [value, isValueInOptions, isOtherValue]);

  const handleSelectChange = (newValue: string) => {
    setSelectedOption(newValue);
    if (newValue === "Other") {
      onChange(customText ? `Other: ${customText}` : "Other: ");
    } else {
      onChange(newValue);
      setCustomText("");
    }
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    onChange(`Other: ${text}`);
  };

  // ── Button list mode ─────────────────────────────────────────────────────
  if (expanded) {
    const isMultiCol = cols > 1;
    const gap = compact ? 4 : 6;

    const btnBase = compact
      ? "w-full text-left px-2 py-1 text-xs rounded border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      : "w-full text-left px-3 py-1.5 text-sm rounded border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
    const btnSelected =
      "bg-primary border-primary text-primary-foreground hover:bg-primary/90";
    const btnUnselected =
      "bg-transparent border-border text-foreground hover:bg-accent hover:border-accent-foreground/20";

    return (
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <div
          style={
            isMultiCol
              ? {
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap,
                }
              : { display: "flex", flexDirection: "column", gap }
          }
        >
          {options.map((option, index) => {
            const isSelected = selectedOption === option;

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => handleSelectChange(option)}
                className={`${btnBase} ${isSelected ? btnSelected : btnUnselected}`}
              >
                {option || "(empty)"}
              </button>
            );
          })}

          {allowOther && (
            <div style={isMultiCol ? { gridColumn: "1 / -1" } : undefined}>
              <button
                type="button"
                onClick={() => handleSelectChange("Other")}
                className={`${btnBase} ${selectedOption === "Other" ? btnSelected : btnUnselected}`}
              >
                Other
              </button>
              {selectedOption === "Other" && (
                <div className="pt-1">
                  <Textarea
                    value={customText}
                    onChange={(e) => handleCustomTextChange(e.target.value)}
                    placeholder="Enter any text, markdown, or custom value..."
                    className={
                      compact ? "min-h-[80px] text-xs" : "min-h-[100px] text-sm"
                    }
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Dropdown mode (default) ──────────────────────────────────────────────
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <Select value={selectedOption} onValueChange={handleSelectChange}>
        <SelectTrigger className={compact ? "w-full h-8 text-xs" : "w-full"}>
          <SelectValue placeholder="Choose an option..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <SelectItem
              key={`${option}-${index}`}
              value={option || `__empty_${index}`}
            >
              {option || "(empty)"}
            </SelectItem>
          ))}
          {allowOther && <SelectItem value="Other">Other</SelectItem>}
        </SelectContent>
      </Select>

      {selectedOption === "Other" && (
        <Textarea
          value={customText}
          onChange={(e) => handleCustomTextChange(e.target.value)}
          placeholder="Enter any text, markdown, or custom value..."
          className={compact ? "min-h-[80px] text-xs" : "min-h-[100px] text-sm"}
          autoFocus
        />
      )}
    </div>
  );
}
