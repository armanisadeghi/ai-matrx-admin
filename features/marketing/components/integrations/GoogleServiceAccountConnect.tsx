"use client";

// Connect Google with a service account key (agencies). Search Console only: the
// server signs in as the account for exactly that scope and verifies the key by a
// real property list before it stores anything.

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  if (!open) {
    return (
      <Button icon={<KeyRound />} variant="outline" onClick={() => setOpen(true)}>
        Add service account key
      </Button>
    );
  }
  return (
    <div className="w-full space-y-1.5 rounded-md border border-border bg-muted/20 p-2">
      <Textarea
        value={json}
        onChange={(event) => setJson(event.target.value)}
        placeholder="Paste the service account key (JSON)"
        rows={5}
        className="font-mono text-[10px]"
        aria-label="Service account key"
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          icon={connect.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          variant="primary"
          disabled={json.trim().length < 20 || connect.isPending}
          onClick={() => void submit("user")}
        >
          Connect for me
        </Button>
        {hasOrganization ? (
          <Button
            variant="outline"
            disabled={json.trim().length < 20 || connect.isPending}
            onClick={() => void submit("organization")}
          >
            Connect for my organization
          </Button>
        ) : null}
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
