"use client";

// Connect Google with a service account key (agencies). Search Console only: the
// server signs in as the account for exactly that scope and verifies the key by a
// real property list before it stores anything.

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { describeBackendFailure } from "@ai-matrx/api";
import { useConnectGoogleServiceAccount } from "@/features/marketing/google/hooks";

export function GoogleServiceAccountConnect({
  hasOrganization,
}: {
  hasOrganization: boolean;
}) {
  const connect = useConnectGoogleServiceAccount();
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");

  const submit = async (owner: "user" | "organization") => {
    try {
      const result = await connect.mutateAsync({ serviceAccountJson: json, owner });
      toast.success("Service account connected", {
        description: `${result.account_email} · ${result.search_console_properties.length} Search Console properties`,
      });
      setJson("");
      setOpen(false);
    } catch (error) {
      toast.error("The service account could not be connected", {
        description: describeBackendFailure(error).headline,
      });
    }
  };

  const ready = json.trim().length >= 20 && !connect.isPending;
  return (
    <>
      <Button icon={<KeyRound />} variant="outline" onClick={() => setOpen(true)}>
        Add service account key
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Service account key</DialogTitle>
          </DialogHeader>
          <Textarea
            value={json}
            onChange={(event) => setJson(event.target.value)}
            placeholder="Paste the service account key (JSON)"
            rows={8}
            className="font-mono text-[10px]"
            aria-label="Service account key"
          />
          <DialogFooter>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {hasOrganization ? (
              <Button
                variant="outline"
                disabled={!ready}
                onClick={() => void submit("organization")}
              >
                Connect for my organization
              </Button>
            ) : null}
            <Button
              icon={connect.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
              variant="primary"
              disabled={!ready}
              onClick={() => void submit("user")}
            >
              Connect for me
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
