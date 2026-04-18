"use client";

import { useState } from "react";
import IconInputWithValidation, {
  IconInputCompact,
} from "@/components/official/IconInputWithValidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

/**
 * Lazy chunk: official text input + validation (no full icon grid)
 */
export default function OfficialIconInputDemo() {
  const [full, setFull] = useState("Home");
  const [compact, setCompact] = useState("Star");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            IconInputWithValidation
            <Badge variant="secondary" className="font-mono text-[10px]">
              @/components/official/IconInputWithValidation
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Typed name + validation + link to lucide.dev —{" "}
            <span className="text-foreground font-medium">
              no in-app searchable grid
            </span>
            . To compare, mount{" "}
            <span className="font-medium text-foreground">
              Full Lucide browser
            </span>{" "}
            in the list above and click its outline button.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Full</Label>
            <IconInputWithValidation value={full} onChange={setFull} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">IconInputCompact</Label>
            <IconInputCompact value={compact} onChange={setCompact} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
