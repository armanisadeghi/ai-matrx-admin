"use client";

import { useState } from "react";
import {
  IconPicker,
  IconInput,
  IconValidator,
} from "@/components/ui/icon-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Lazy chunk: full Lucide browser from @/components/ui/icon-picker
 */
export default function LucideFullDemo() {
  const [pickerIcon, setPickerIcon] = useState("Folder");
  const [inputIcon, setInputIcon] = useState("Sparkles");

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 px-3 py-2 text-xs text-foreground">
        <p className="font-semibold">How to try discovery</p>
        <ol className="list-decimal list-inside mt-1.5 space-y-1 text-muted-foreground">
          <li>
            In the first card, click the{" "}
            <span className="text-foreground font-medium">outlined button</span>{" "}
            labeled with the small icon +{" "}
            <code className="font-mono text-foreground">Folder</code> (or
            “Choose Icon” if empty).
          </li>
          <li>
            A dialog opens: use the search field, scroll the grid, click an icon
            to select it.
          </li>
          <li>
            In the second card, the same outline button sits{" "}
            <span className="text-foreground font-medium">
              to the right of the text field
            </span>{" "}
            — that also opens the full grid.
          </li>
        </ol>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            IconPicker (modal grid)
            <Badge variant="secondary" className="font-mono text-[10px]">
              @/components/ui/icon-picker
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Discovery UI: click the button below (not this text). Selected:{" "}
            <span className="font-mono text-foreground">{pickerIcon}</span>
          </p>
        </CardHeader>
        <CardContent>
          <IconPicker value={pickerIcon} onChange={setPickerIcon} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            IconInput + IconValidator
            <Badge variant="secondary" className="font-mono text-[10px]">
              same module
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Text field with picker side button and validation preview.
          </p>
        </CardHeader>
        <CardContent>
          <IconInput value={inputIcon} onChange={setInputIcon} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">IconValidator only</CardTitle>
          <p className="text-xs text-muted-foreground">
            Inline validate / preview for a name.
          </p>
        </CardHeader>
        <CardContent>
          <IconValidator iconName={inputIcon} showPreview />
        </CardContent>
      </Card>
    </div>
  );
}
