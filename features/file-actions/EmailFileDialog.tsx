"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { toast } from "@/lib/toast";
import { getResourceSharePath } from "@/utils/permissions/registry";
import type { ResourceType } from "@/utils/permissions/types";

/** File → Email ▸ "Email this file" (typed addresses) and "Email collaborators" (everyone it is shared with). */
export function EmailFileDialog({
  mode,
  resourceType,
  resourceId,
  name,
  onClose,
}: {
  mode: "file" | "collaborators";
  resourceType: ResourceType;
  resourceId: string;
  name: string;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const everyone = mode === "collaborators";

  const send = async () => {
    const path = getResourceSharePath(resourceType, resourceId);
    const url = path ? `${window.location.origin}${path}` : window.location.href;
    setBusy(true);
    try {
      const res = await fetch("/api/sharing/email-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType,
          resourceId,
          resourceName: name,
          url,
          message,
          ...(everyone ? { collaborators: true } : { to }),
        }),
      });
      const data = await res.json().catch(() => ({ success: false, msg: "Failed to send email" }));
      if (!res.ok || !data.success) throw new Error(data.msg || "Failed to send email");
      toast.success(everyone ? "Emailed your collaborators" : "Email sent");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md" data-editor-email-dialog="">
        <DialogHeader>
          <DialogTitle className="truncate">{everyone ? "Email collaborators" : `Email "${name}"`}</DialogTitle>
        </DialogHeader>
        {everyone ? null : (
          <ProInput
            id="email-file-to"
            floatingLabel="To"
            placeholder="name@example.com, another@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        )}
        <ProTextarea
          id="email-file-message"
          floatingLabel="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void send()} disabled={busy || (!everyone && !to.trim())}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
