'use client';

import { Textarea } from "@/components/ui";
import { cn } from '@/utils/cn';
import React, { useState } from "react";
import JSON5 from 'json5';

interface JsonEditorProps extends React.ComponentPropsWithRef<typeof Textarea> {
  value?: any;
  onChange?: (value: any) => void;
  className?: string;
}

// Utility functions for JSON manipulation and validation
const jsonUtils = {
  /**
   * Detects if a string is stringified JSON and unwraps it
   */
  unwrapStringifiedJson: (value: any): any => {
    if (typeof value !== "string") return value;
    
    try {
      // Check if it's a stringified JSON by trying to parse it
      const parsed = JSON.parse(value);
      
      // If parsed result is an object or array (not primitive), it was likely stringified JSON
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    } catch (err) {
      // If parsing fails, it's just a regular string
    }
    
    return value;
  },

  /**
   * Converts various input types to a formatted string representation
   */
  convertToString: (value: any): string => {
    if (value === null || value === undefined) return "";
    
    // First, try to unwrap stringified JSON
    const unwrapped = jsonUtils.unwrapStringifiedJson(value);
    
    if (typeof unwrapped === "string") return unwrapped;
    
    // For objects/arrays, convert to pretty JSON
    try {
      return JSON.stringify(unwrapped, null, 2);
    } catch (err) {
      // Fallback to string conversion
      return String(unwrapped);
    }
  },

  /**
   * Validates if a string can be parsed as valid JSON
   */
  isValidJson: (text: string): boolean => {
    try {
      JSON.parse(text);
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Attempts to parse JSON string to object
   * Returns the parsed object if successful, original string if not
   */
  safeParse: (text: string): any => {
    if (!text.trim()) return text;
    
    try {
      return JSON.parse(text);
    } catch (err) {
      // Try with JSON5 for more forgiving parsing
      try {
        return JSON5.parse(text);
      } catch (err2) {
        return text; // Return original string if parsing fails
      }
    }
  },

  /**
   * Attempts to safely format JSON string for display
   * Returns the formatted string if successful, original string if not
   */
  safeFormat: (text: string): string => {
    if (!text.trim()) return text;
    
    try {
      // First try parsing with JSON5 which is more forgiving
      const parsed = JSON5.parse(text);
      
      // Convert back to pretty formatted JSON
      return JSON.stringify(parsed, null, 2);
    } catch (err) {
      // Try converting Python None to null
      try {
        const converted = text.replace(/None/g, "null");
        const parsed = JSON5.parse(converted);
        return JSON.stringify(parsed, null, 2);
      } catch (err2) {
        // If everything fails, return original
        return text;
      }
    }
  }
};

const JsonEditor = React.forwardRef<HTMLTextAreaElement, JsonEditorProps>(
  ({ value, onChange, className, onBlur, ...props }, ref) => {
    const [isValid, setIsValid] = useState(true);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      // During typing, always send back the raw string
      onChange?.(newText);
      setIsValid(jsonUtils.isValidJson(newText));
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      
      // Attempt to format the display
      const formatted = jsonUtils.safeFormat(text);
      
      // Update the display if formatting was successful and different
      if (formatted !== text) {
        // Update the textarea value directly for display
        e.target.value = formatted;
      }
      
      // Determine what to send back via onChange
      let valueToSend;
      if (jsonUtils.isValidJson(formatted)) {
        // Send back parsed object for valid JSON
        valueToSend = jsonUtils.safeParse(formatted);
        setIsValid(true);
      } else {
        // Send back string for invalid JSON (no errors)
        valueToSend = text;
        setIsValid(false);
      }
      
      onChange?.(valueToSend);
      onBlur?.(e);
    };

    return (
      <Textarea
        ref={ref}
        value={jsonUtils.convertToString(value)}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "font-mono",
          !isValid && "border-2 border-red-500 dark:border-red-400",
          className
        )}
        spellCheck="false"
        {...props}
      />
    );
  }
);

JsonEditor.displayName = "JsonEditor";

export default JsonEditor;