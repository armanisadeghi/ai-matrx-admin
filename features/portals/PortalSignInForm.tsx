"use client";

// The one interactive part of the sign-in panel: an email field and a button.
// Everything around it — the portal's title, the organization's name, the
// layout and its dimensions — is server-rendered by the page, so nothing on
// this screen moves after the first paint.
//
// 🚨 THE ANSWER IS THE SAME SENTENCE EITHER WAY, and it comes from the route,
// not from here, so the screen cannot drift from the endpoint's promise. There
// is deliberately no "we don't recognize that address" branch to write.

import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";

import { Input } from "@ai-matrx/design-system/controls";

import { Button } from "@/components/ui/button";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { signInWithGoogleAction } from "@/actions/auth.actions";
import { supabase } from "@/utils/supabase/client";

/** CD-PAGE-12: the ways in the portal's owner turned on (`custom.portal_public.access`). The email link is always one. */
export interface PortalWaysIn {
  password: boolean;
  google: boolean;
  self_signup: boolean;
}

export function PortalSignInForm({ slug, ways }: { slug: string; ways?: PortalWaysIn | null }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  // CD-PAGE-12: which way in is on screen — the link (default), a password, or signing up.
  const [mode, setMode] = useState<"link" | "password" | "signup">("link");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setProblem(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setProblem("That email and password do not match. Use the email link instead, or try again.");
      setState("error");
      return;
    }
    // Signed in on this origin: the page now draws her portal (the server reads the new session).
    window.location.reload();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setProblem(null);
    try {
      const response = await fetch(`/api/portal/${encodeURIComponent(slug)}/${mode === "signup" ? "sign-up" : "sign-in"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { email, name } : { email }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!response.ok) {
        // The route's own words. A failure never becomes a silent no-op and
        // never becomes a generic "something went wrong".
        setProblem(body?.message ?? "That did not go through. Try again in a moment.");
        setState("error");
        return;
      }
      setState("sent");
    } catch {
      setProblem("We could not reach the portal just now. Check your connection and try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">Check your email</p>
        <p className="mt-1 text-muted-foreground">
          If that address is on this portal, a sign-in link is on its way. The link is
          single-use and expires shortly.
        </p>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-primary underline underline-offset-4"
          onClick={() => setState("idle")}
        >
          Use a different address
        </button>
      </div>
    );
  }

  const others = (
    <div className="mt-4 flex flex-col gap-2" data-portal-ways-in="">
      {ways?.google ? (
        <form action={signInWithGoogleAction}>
          <input type="hidden" name="redirectTo" value={`/portal/c/${slug}`} />
          <Button variant="outline" type="submit" className="w-full" data-portal-google="">
            Continue with Google
          </Button>
        </form>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        {mode !== "link" ? (
          <button type="button" className="font-medium text-primary underline underline-offset-4" onClick={() => setMode("link")}>
            Email me a link instead
          </button>
        ) : null}
        {ways?.password && mode !== "password" ? (
          <button type="button" className="font-medium text-primary underline underline-offset-4" onClick={() => setMode("password")} data-portal-use-password="">
            Use a password
          </button>
        ) : null}
        {ways?.self_signup && mode !== "signup" ? (
          <button type="button" className="font-medium text-primary underline underline-offset-4" onClick={() => setMode("signup")} data-portal-sign-up="">
            New here? Sign up
          </button>
        ) : null}
      </div>
    </div>
  );

  if (mode === "password") {
    return (
      <>
        <form onSubmit={onPassword} className="mt-6 space-y-3" data-portal-password-form="">
          <label htmlFor="portal-email" className="block text-sm font-medium text-foreground">
            Your email address
          </label>
          <Input id="portal-email" name="email" type="email" inputMode="email" autoComplete="email" required value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} placeholder="you@yourcompany.com" />
          <label htmlFor="portal-password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <Input id="portal-password" name="password" type="password" autoComplete="current-password" required value={password}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} />
          <Button variant="primary" type="submit" className="w-full" disabled={state === "sending"}>
            {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
          {problem ? <p className="text-sm text-destructive">{problem}</p> : null}
        </form>
        {others}
      </>
    );
  }

  return (
    <>
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {mode === "signup" ? (
        <>
          <label htmlFor="portal-name" className="block text-sm font-medium text-foreground">
            Your name
          </label>
          <Input id="portal-name" name="name" autoComplete="name" required value={name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)} data-portal-name="" />
        </>
      ) : null}
      <label htmlFor="portal-email" className="block text-sm font-medium text-foreground">
        Your email address
      </label>
      <Input
        id="portal-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
        placeholder="you@yourcompany.com"
        aria-describedby={problem ? "portal-email-problem" : undefined}
      />
      <Button variant="primary" type="submit" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending your link
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            {mode === "signup" ? "Sign up and email me a link" : "Email me a sign-in link"}
          </>
        )}
      </Button>
      {problem ? (
        <p id="portal-email-problem" className="text-sm text-destructive">
          {problem}
          <ErrorAlchemyMenu error={problem} />
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No password to remember — we email you a link that signs you in.
        </p>
      )}
    </form>
    {others}
    </>
  );
}
