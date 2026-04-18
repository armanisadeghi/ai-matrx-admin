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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            IconPicker (modal grid)
            <Badge variant="secondary" className="font-mono text-[10px]">
              @/components/ui/icon-picker
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            All Lucide exports — search + grid. Selected:{" "}
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
