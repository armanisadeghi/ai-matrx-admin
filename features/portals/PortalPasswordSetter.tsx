"use client";

// features/portals/PortalPasswordSetter.tsx — CD-PAGE-12: A SIGNED-IN PORTAL CLIENT SETS A PASSWORD.
//
// Shown on her portal only when its owner turned password sign-in on. She came in by her email link; a password lets
// her come back by email and password next time. It is her own sign-in's password, set through her own session
// (`auth.updateUser`), never seen by the business.

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/supabase/client";

export function PortalPasswordSetter() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setProblem("Use at least 8 characters.");
      setState("error");
      return;
    }
    setState("saving");
    setProblem(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setProblem(error.message);
      setState("error");
      return;
    }
    setPassword("");
    setState("saved");
    setOpen(false);
  }

  if (!open) {
    return (
      <p className="text-xs text-muted-foreground" data-portal-password-setter="">
        {state === "saved" ? "Password saved. " : null}
        <button type="button" className="font-medium text-primary underline underline-offset-4" onClick={() => setOpen(true)}>
          {state === "saved" ? "Change it" : "Set a password"}
        </button>
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2" data-portal-password-setter="">
      <Input
        type="password"
        autoComplete="new-password"
        aria-label="New password"
        placeholder="New password"
        value={password}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
        className="max-w-xs"
      />
      <Button type="submit" variant="primary" disabled={state === "saving"}>
        {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save password
      </Button>
      <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {problem ? <p className="w-full text-xs text-destructive">{problem}</p> : null}
    </form>
  );
}
