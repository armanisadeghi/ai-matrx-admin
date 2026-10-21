"use client";

import { Button as ControlButton } from "@ai-matrx/design-system/controls";
import React from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { HtmlPreviewTabProps } from "../types";

export function CustomCopyTab({ state, actions }: HtmlPreviewTabProps) {
  return (
    <div className="h-full flex flex-col justify-center items-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Custom Copy Options
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select which elements to include in your copied HTML
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={state.includeBulletStyles}
                onCheckedChange={(checked) =>
                  actions.setIncludeBulletStyles(checked === true)
                }
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include Bullet Styles
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep custom bullet point styling in lists
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={state.includeDecorativeLineBreaks}
                onCheckedChange={(checked) =>
                  actions.setIncludeDecorativeLineBreaks(checked === true)
                }
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include Decorative Line Breaks
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep horizontal rule separators (hr elements)
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="text-center">
          <ControlButton variant={state.copiedCustom ? "success" : "primary"} onClick={actions.handleCopyCustom} icon={state.copiedCustom ? <CheckCircle2 size={18} /> : <Copy size={18} />}>{state.copiedCustom ? "Copied to Clipboard!" : "Copy Custom HTML"}</ControlButton>

          {!state.includeBulletStyles && !state.includeDecorativeLineBreaks && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              All styling options are disabled
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
