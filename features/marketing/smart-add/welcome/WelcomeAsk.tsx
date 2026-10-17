"use client";

/**
 * Sign-up welcome — the two honest frames around the person grid (SIGNUP-WELCOME.md; smart-add VISION Parts 15, 29).
 *
 * - `WelcomeNameFrame`: the login, the name typed at sign-up, the email and its free lookups gave no name. One field,
 *   "Your name", and one way out, "Skip" (the welcome tiles). Never a grid greeting nobody ("Welcome" + "?").
 * - `WelcomeNothingFrame`: the rounds settled and the only certain facts are what the person typed (a city typed
 *   under "None of these" is not a finding). One field to search again with another detail, and "Skip".
 */

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Field } from "@ai-matrx/design-system/controls";
import found from "../found/found.module.css";
import { NarrowField } from "./PersonPickCards";

function Frame({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <section
      className={`${found.panel} mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-[2rem] p-4 sm:gap-7 sm:p-8`}
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
    >
      <h1 id={`${testId}-title`} className="px-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[2.25rem]">
        {title}
      </h1>
      {children}
    </section>
  );
}

function SkipRow({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="flex px-1">
      <Button variant="quiet" onClick={onSkip} data-testid="welcome-skip">
        Skip
      </Button>
    </div>
  );
}

export function WelcomeNameFrame({ onName, onSkip }: { onName: (name: string) => void; onSkip: () => void }) {
  const [text, setText] = useState("");
  const name = text.trim().replace(/\s+/g, " ");
  return (
    <Frame title="What's your name?" testId="welcome-name">
      <form
        className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (name) onName(name);
        }}
      >
        <Field
          // ui-exception: a person's own name, a raw value in one slot
          hero
          autoFocus
          autoComplete="name"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          data-testid="welcome-name-field"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="primary" hero icon={<ArrowRight aria-hidden />} disabled={!name} data-testid="welcome-name-submit">
          Continue
        </Button>
      </form>
      <SkipRow onSkip={onSkip} />
    </Frame>
  );
}

export function WelcomeNothingFrame({ onNarrow, onSkip }: { onNarrow: (text: string) => void; onSkip: () => void }) {
  return (
    <Frame title="We couldn't find you yet" testId="welcome-nothing">
      <div className="px-1">
        <NarrowField onNarrow={onNarrow} />
      </div>
      <SkipRow onSkip={onSkip} />
    </Frame>
  );
}
