"use client";

import { Settings2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  setBuilderAdvancedSettings,
  setReuseConversationId,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import {
  selectBuilderAdvancedSettings,
  selectReuseConversationId,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";

interface BuilderAdvancedSettingsPopoverProps {
  instanceId: string;
}

export function BuilderAdvancedSettingsPopover({
  instanceId,
}: BuilderAdvancedSettingsPopoverProps) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectBuilderAdvancedSettings(instanceId));
  const reuseConversationId = useAppSelector(
    selectReuseConversationId(instanceId),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          Test Run Settings
        </p>

        {/* Debug toggle */}
        <div className="flex items-center justify-between py-1.5">
          <Label
            htmlFor={`debug-${instanceId}`}
            className="text-sm cursor-pointer"
          >
            Debug mode
          </Label>
          <Switch
            id={`debug-${instanceId}`}
            checked={settings.debug}
            onCheckedChange={(checked) =>
              dispatch(
                setBuilderAdvancedSettings({
                  instanceId,
                  changes: { debug: checked },
                }),
              )
            }
          />
        </div>

        {/* Store toggle */}
        <div className="flex items-center justify-between py-1.5">
          <Label
            htmlFor={`store-${instanceId}`}
            className="text-sm cursor-pointer"
          >
            Save to DB
          </Label>
          <Switch
            id={`store-${instanceId}`}
            checked={settings.store}
            onCheckedChange={(checked) =>
              dispatch(
                setBuilderAdvancedSettings({
                  instanceId,
                  changes: { store: checked },
                }),
              )
            }
          />
        </div>

        {/* Reuse conversation ID toggle */}
        <div className="flex items-center justify-between py-1.5">
          <Label
            htmlFor={`reuse-cid-${instanceId}`}
            className="text-sm cursor-pointer"
          >
            Reuse conversation ID
          </Label>
          <Switch
            id={`reuse-cid-${instanceId}`}
            checked={reuseConversationId}
            onCheckedChange={(checked) =>
              dispatch(setReuseConversationId({ instanceId, value: checked }))
            }
          />
        </div>

        {/* Structured system instruction toggle */}
        <div className="flex items-center justify-between py-1.5">
          <Label
            htmlFor={`structured-sys-${instanceId}`}
            className="text-sm cursor-pointer"
          >
            Structured system prompt
          </Label>
          <Switch
            id={`structured-sys-${instanceId}`}
            checked={settings.useStructuredSystemInstruction}
            onCheckedChange={(checked) =>
              dispatch(
                setBuilderAdvancedSettings({
                  instanceId,
                  changes: { useStructuredSystemInstruction: checked },
                }),
              )
            }
          />
        </div>

        <Separator className="my-2" />

        {/* Max iterations */}
        <div className="flex items-center justify-between py-1.5 gap-3">
          <Label
            htmlFor={`max-iter-${instanceId}`}
            className="text-sm shrink-0"
          >
            Max iterations
          </Label>
          <Input
            id={`max-iter-${instanceId}`}
            type="number"
            min={1}
            max={100}
            className="w-16 h-7 text-sm text-right"
            style={{ fontSize: "16px" }}
            value={settings.maxIterations}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) {
                dispatch(
                  setBuilderAdvancedSettings({
                    instanceId,
                    changes: { maxIterations: val },
                  }),
                );
              }
            }}
          />
        </div>

        {/* Max retries per iteration */}
        <div className="flex items-center justify-between py-1.5 gap-3">
          <Label
            htmlFor={`max-retries-${instanceId}`}
            className="text-sm shrink-0"
          >
            Retries / iteration
          </Label>
          <Input
            id={`max-retries-${instanceId}`}
            type="number"
            min={0}
            max={10}
            className="w-16 h-7 text-sm text-right"
            style={{ fontSize: "16px" }}
            value={settings.maxRetriesPerIteration}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 0) {
                dispatch(
                  setBuilderAdvancedSettings({
                    instanceId,
                    changes: { maxRetriesPerIteration: val },
                  }),
                );
              }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
