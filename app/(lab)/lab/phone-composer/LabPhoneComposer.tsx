"use client";

import { useState } from "react";
import type { ComposerInputRenderProps } from "@ai-matrx/messaging/react";
import { MessagesComposerInput } from "@/features/messaging/components/MessagesComposerInput";
import "@/features/messaging/messages-native.css";

function Frame({ width, label }: { width: number; label: string }) {
  const [value, setValue] = useState("");
  const input: ComposerInputRenderProps = {
    additions: [],
    add: () => {},
    removeAddition: () => {},
    value,
    disabled: false,
    canSend: value.trim().length > 0,
    placeholder: "Message",
    onChange: setValue,
    onKeyDown: () => {},
    onSubmit: () => setValue(""),
  };
  return (
    <section data-frame={label} style={{ width }} className="messages-native rounded-lg border border-border p-2">
      <p className="pb-2 text-xs text-muted-foreground">{label}</p>
      <MessagesComposerInput input={input} surfaceName="lab-phone-composer" />
    </section>
  );
}

export function LabPhoneComposer() {
  return (
    <main className="space-y-6 p-4">
      <Frame width={360} label="Phone (360px pane)" />
      <Frame width={860} label="Desktop (860px pane)" />
    </main>
  );
}
