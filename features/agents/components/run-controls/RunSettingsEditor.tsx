"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  setBuilderAdvancedSettings,
  setReuseConversationId,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import {
  selectBuilderAdvancedSettings,
  selectReuseConversationId,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { DEFAULT_BUILDER_ADVANCED_SETTINGS } from "@/features/agents/types/instance.types";
import { SystemInstructionModal } from "../system-instructions/SystemInstructionModal";
import { NumberStepper } from "@/components/official-candidate/NumberStepper";

interface RunSettingsEditorProps {
  instanceId: string;
}

function SettingRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label
        htmlFor={id}
        className="text-xs text-muted-foreground cursor-pointer"
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="scale-75 origin-right"
      />
    </div>
  );
}

export function RunSettingsEditor({ instanceId }: RunSettingsEditorProps) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectBuilderAdvancedSettings(instanceId)) ?? DEFAULT_BUILDER_ADVANCED_SETTINGS;
  const reuseConversationId = useAppSelector(
    selectReuseConversationId(instanceId),
  );
  const [sysModalOpen, setSysModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-0.5">
        <SettingRow
          id={`debug-${instanceId}`}
          label="Debug mode"
          checked={settings.debug}
          onChange={(v) =>
            dispatch(
              setBuilderAdvancedSettings({ instanceId, changes: { debug: v } }),
            )
          }
        />
        <SettingRow
          id={`store-${instanceId}`}
          label="Save to DB"
          checked={settings.store}
          onChange={(v) =>
            dispatch(
              setBuilderAdvancedSettings({ instanceId, changes: { store: v } }),
            )
          }
        />
        <SettingRow
          id={`reuse-cid-${instanceId}`}
          label="Reuse conversation ID"
          checked={reuseConversationId}
          onChange={(v) =>
            dispatch(setReuseConversationId({ instanceId, value: v }))
          }
        />

        <Separator className="!my-1.5" />

        <SettingRow
          id={`structured-sys-${instanceId}`}
          label="Structured system prompt"
          checked={settings.useStructuredSystemInstruction}
          onChange={(v) =>
            dispatch(
              setBuilderAdvancedSettings({
                instanceId,
                changes: { useStructuredSystemInstruction: v },
              }),
            )
          }
        />

        {settings.useStructuredSystemInstruction && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs mt-1"
            onClick={() => setSysModalOpen(true)}
          >
            <FileText className="w-3 h-3 mr-1.5" />
            Configure instruction fields
          </Button>
        )}

        <Separator className="!my-1.5" />

        <div className="flex items-center justify-between py-1 gap-3">
          <Label className="text-xs text-muted-foreground shrink-0">
            Max iterations
          </Label>
          <NumberStepper
            value={settings.maxIterations}
            onChange={(v) =>
              dispatch(
                setBuilderAdvancedSettings({
                  instanceId,
                  changes: { maxIterations: v },
                }),
              )
            }
            min={1}
            max={100}
            className="h-6"
          />
        </div>

        <div className="flex items-center justify-between py-1 gap-3">
          <Label className="text-xs text-muted-foreground shrink-0">
            Retries / iteration
          </Label>
          <NumberStepper
            value={settings.maxRetriesPerIteration}
            onChange={(v) =>
              dispatch(
                setBuilderAdvancedSettings({
                  instanceId,
                  changes: { maxRetriesPerIteration: v },
                }),
              )
            }
            min={0}
            max={10}
            className="h-6"
          />
        </div>
      </div>

      <SystemInstructionModal
        instanceId={instanceId}
        open={sysModalOpen}
        onOpenChange={setSysModalOpen}
      />
    </>
  );
}
