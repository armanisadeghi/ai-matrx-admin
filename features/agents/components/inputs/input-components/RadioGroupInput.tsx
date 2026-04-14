import React, { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { calcCols } from "./useContainerColumns";

interface RadioGroupInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  variableName: string;
  allowOther?: boolean;
  compact?: boolean;
  wizardMode?: boolean;
  wrap?: boolean;
  containerWidth?: number;
}

/**
 * Radio Group Input - Single select that returns selected option as text
 */
export function RadioGroupInput({
  value,
  onChange,
  options,
  variableName,
  allowOther = false,
  compact = false,
  wizardMode = false,
  wrap = true,
  containerWidth = 0,
}: RadioGroupInputProps) {
  const isOtherValue = value.startsWith("Other: ");
  const otherText = isOtherValue ? value.substring(7) : "";

  const isValueInOptions = options.includes(value);

  const [selectedOption, setSelectedOption] = useState<string>(() => {
    if (isValueInOptions) return value;
    if (isOtherValue) return "Other";
    return value;
  });

  const [customText, setCustomText] = useState<string>(otherText);

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

  const handleOptionChange = (newValue: string) => {
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

  const itemClass = compact
    ? "flex items-center space-x-2 p-1 bg-transparent rounded border-border hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
    : "flex items-center space-x-3 p-1.5 bg-transparent rounded border-border hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer";

  const cols = calcCols(containerWidth, options, wrap, compact);
  const isMultiCol = cols > 1;
  const gap = compact ? 4 : 6;

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <RadioGroup value={selectedOption} onValueChange={handleOptionChange}>
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
          {options.map((option, index) => (
            <label
              key={`${option}-${index}`}
              htmlFor={`${variableName}-${option}-${index}`}
              className={itemClass}
            >
              <RadioGroupItem
                value={option}
                id={`${variableName}-${option}-${index}`}
              />
              <span className={compact ? "flex-1 text-xs" : "flex-1 text-sm"}>
                {option || "(empty)"}
              </span>
            </label>
          ))}

          {allowOther && (
            <div style={isMultiCol ? { gridColumn: "1 / -1" } : undefined}>
              <label htmlFor={`${variableName}-other`} className={itemClass}>
                <RadioGroupItem value="Other" id={`${variableName}-other`} />
                <span className={compact ? "flex-1 text-xs" : "flex-1 text-sm"}>
                  Other
                </span>
              </label>

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
      </RadioGroup>
    </div>
  );
}
