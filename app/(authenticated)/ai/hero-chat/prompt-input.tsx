"use client";

import type {TextAreaProps} from "@heroui/react";

import React from "react";
import {Textarea} from "@heroui/react";
import {cn} from "@heroui/react";

const PromptInput = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({classNames = {}, ...props}, ref) => {
    return (
      <Textarea
        ref={ref}
        aria-label="Prompt"
        className="min-h-[40px]"
        classNames={{
          ...classNames,
          base: cn("border-none", classNames?.base), // Added debug border
          label: cn("hidden", classNames?.label),
          input: cn("py-0 border-none", classNames?.input),
          inputWrapper: cn("border-none", classNames?.inputWrapper), // Added debug border
          innerWrapper: cn("border-none", classNames?.innerWrapper), // Added debug border
        }}
        minRows={1}
        placeholder="Enter a prompt here"
        radius="lg"
        variant="bordered"
        {...props}
      />
    );
  },
);

export default PromptInput;

PromptInput.displayName = "PromptInput";