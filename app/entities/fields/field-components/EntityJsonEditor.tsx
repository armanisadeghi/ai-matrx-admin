"use client";

import React, { useState, useRef, useEffect } from "react";
import { FieldComponentProps } from "../types";
import { EditableJsonViewer } from "@/components/ui";
import {
  FloatingFieldLabel,
  StandardFieldLabel,
} from "./add-ons/FloatingFieldLabel";
import { useFieldStyles } from "./add-ons/useFieldStyles";

type JsonValue = object | string | null;

type EntityJsonFieldProps = FieldComponentProps<JsonValue>;

const EntityJsonEditor = React.forwardRef<
  HTMLInputElement,
  EntityJsonFieldProps
>(
  (
    {
      entityKey,
      dynamicFieldInfo,
      value,
      onChange,
      disabled,
      className,
      density,
      animationPreset,
      size,
      textSize,
      variant,
      floatingLabel,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState<number>(150);

    const isEmptyValue = (val: JsonValue): boolean => {
      if (val === null) return true;
      if (typeof val === "string") return val.trim() === "";
      if (Array.isArray(val)) return val.length === 0;
      return Object.keys(val).length === 0;
    };

    useEffect(() => {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          if (newHeight > 0) {
            // Add a larger buffer when floating label is present to account for its height
            const adjustedHeight = floatingLabel ? newHeight + 24 : newHeight;
            setContentHeight(Math.max(150, adjustedHeight));
          }
        }
      });

      if (contentRef.current) {
        observer.observe(contentRef.current);
      }

      return () => observer.disconnect();
    }, [floatingLabel]);

    const { getInputStyles } = useFieldStyles({
      variant,
      size,
      density,
      disabled,
      focused: isFocused,
      hasValue: !isEmptyValue(value),
      isFloating: floatingLabel,
    });

    const renderEditor = () => (
      <div
        ref={containerRef}
        className={`${getInputStyles} relative border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 hover:bg-accent/50 min-h-[150px] transition-all duration-200`}
        style={{ 
          maxHeight: `${contentHeight}px`,
          height: 'auto'
        }}
      >
        <div ref={contentRef} className="w-full overflow-visible">
          <EditableJsonViewer
            data={value}
            onChange={onChange}
            readOnly={disabled}
            defaultEnhancedMode={true}
          />
        </div>
      </div>
    );

    return (
      <div className="relative w-full">
        {floatingLabel ? (
          <div className="relative mt-1">
            {renderEditor()}
            <FloatingFieldLabel
              htmlFor={dynamicFieldInfo.name}
              disabled={disabled}
              isFocused={isFocused}
              hasValue={!isEmptyValue(value)}
            >
              {dynamicFieldInfo.displayName}
            </FloatingFieldLabel>
          </div>
        ) : (
          <>
            <StandardFieldLabel
              htmlFor={dynamicFieldInfo.name}
              disabled={disabled}
              required={dynamicFieldInfo.isRequired}
            >
              {dynamicFieldInfo.displayName}
            </StandardFieldLabel>
            {renderEditor()}
          </>
        )}
      </div>
    );
  }
);

EntityJsonEditor.displayName = "EntityJsonEditor";

export default React.memo(EntityJsonEditor);