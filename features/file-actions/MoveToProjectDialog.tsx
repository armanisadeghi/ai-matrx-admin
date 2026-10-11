"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectPicker } from "@/features/projects/components/ProjectPicker";

/** Move a record into a project (or out of one) with the platform's project picker. */
export function MoveToProjectDialog({
  name,
  currentProjectId,
  onClose,
  onMove,
}: {
  name: string;
  currentProjectId: string | null;
  onClose: () => void;
  onMove: (projectId: string | null, projectName: string | null) => Promise<void> | void;
}) {
  const [picked, setPicked] = useState<{ id: string | null; name: string | null }>({
    id: currentProjectId,
    name: null,
  });
  const [busy, setBusy] = useState(false);
  const changed = picked.id !== currentProjectId;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">Move "{name}"</DialogTitle>
        </DialogHeader>
        <ProjectPicker
          value={picked.id}
          onSelect={(id, projectName) => setPicked({ id, name: projectName })}
          placeholder="No project"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!changed || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onMove(picked.id, picked.name);
              } finally {
                setBusy(false);
              }
              onClose();
            }}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
