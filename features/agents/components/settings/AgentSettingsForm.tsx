"use client";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { saveAgentField } from "@/features/agents/redux/agent-definition/thunks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HierarchyContextSelector } from "@/features/context/components/HierarchyContextSelector";
import { useState, useEffect, useMemo } from "react";
import type { AgentDefinition } from "@/features/agents/types/agent-definition.types";

interface AgentSettingsFormProps {
  agentId: string;
}

export function AgentSettingsForm({ agentId }: AgentSettingsFormProps) {
  const dispatch = useAppDispatch();
  const agent = useAppSelector((state) => selectAgentById(state, agentId));

  const [draft, setDraft] = useState<Partial<AgentDefinition>>({});
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (agent) {
      setDraft(agent);
      setTagsInput(agent.tags ? agent.tags.join(", ") : "");
    }
  }, [agent]);

  const isDirty = useMemo(() => {
    if (!agent) return false;
    for (const key of Object.keys(draft) as Array<keyof AgentDefinition>) {
      if (key === "tags") continue; // Handled separately
      if (draft[key] !== agent[key]) return true;
    }
    const currentTags = agent.tags || [];
    const draftTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (JSON.stringify(draftTags) !== JSON.stringify(currentTags)) return true;
    
    return false;
  }, [agent, draft, tagsInput]);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Agent data not loaded
      </div>
    );
  }

  const handleUpdate = (field: keyof AgentDefinition, value: any) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Diff and dispatch
    for (const key of Object.keys(draft) as Array<keyof AgentDefinition>) {
      if (key === "tags") continue;
      if (draft[key] !== agent[key]) {
        dispatch(saveAgentField({ agentId, field: key, value: draft[key] as any }));
      }
    }
    // Save tags
    const draftTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const currentTags = agent.tags || [];
    if (JSON.stringify(draftTags) !== JSON.stringify(currentTags)) {
      dispatch(saveAgentField({ agentId, field: "tags", value: draftTags as any }));
    }
  };

  const handleCancel = () => {
    setDraft(agent);
    setTagsInput(agent.tags ? agent.tags.join(", ") : "");
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 p-4 max-w-2xl text-sm pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={draft.name || ""}
                  onChange={(e) => handleUpdate("name", e.target.value)}
                  placeholder="Agent Name"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={draft.description || ""}
                  onChange={(e) => handleUpdate("description", e.target.value)}
                  placeholder="Short description of this agent's capabilities..."
                  className="resize-none h-[116px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={draft.agentType || "user"}
                  onValueChange={(val) => handleUpdate("agentType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="builtin">Built-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label>Owner User ID</Label>
                <Input value={agent.userId || "None"} disabled className="bg-muted/50 font-mono text-xs" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={draft.category || ""}
                  onChange={(e) => handleUpdate("category", e.target.value)}
                  placeholder="e.g. Utilities"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="tag1, tag2..."
                />
              </div>

              <div className="p-4 rounded-lg bg-card border border-border space-y-4">
                <Label className="text-muted-foreground/80 uppercase text-xs tracking-wide">
                  Visibility & Status
                </Label>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-muted-foreground">Active</Label>
                  <Switch
                    checked={draft.isActive ?? false}
                    onCheckedChange={(c) => handleUpdate("isActive", c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-muted-foreground">Public</Label>
                  <Switch
                    checked={draft.isPublic ?? false}
                    onCheckedChange={(c) => handleUpdate("isPublic", c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-muted-foreground">Favorite</Label>
                  <Switch
                    checked={draft.isFavorite ?? false}
                    onCheckedChange={(c) => handleUpdate("isFavorite", c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-muted-foreground">Archived</Label>
                  <Switch
                    checked={draft.isArchived ?? false}
                    onCheckedChange={(c) => handleUpdate("isArchived", c)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border my-2" />

          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-foreground">Hierarchy Scopes</h3>
              <p className="text-xs text-muted-foreground">
                Bind this agent to organizational structures to restrict visibility or functionality context.
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-4">
              <HierarchyContextSelector
                levels={["organization", "project", "task"]}
                selectedOrgId={draft.organizationId || null}
                onOrgChange={(val) => handleUpdate("organizationId", val)}
                selectedProjectId={draft.projectId || null}
                onProjectChange={(val) => handleUpdate("projectId", val)}
                selectedTaskId={draft.taskId || null}
                onTaskChange={(val) => handleUpdate("taskId", val)}
              />
            </div>
          </div>
        </div>
      </div>

      {isDirty && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-muted/90 backdrop-blur-md border-t flex justify-end gap-2 shadow-lg z-20">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Discard Changes
          </Button>
          <Button variant="default" size="sm" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
