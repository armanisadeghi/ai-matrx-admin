"use client";
import { useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { BlockChipPanel, type ChipTarget } from "@/features/prompt-blocks/components/BlockChipPanel";

export default function FrontendCiBlockHarness() {
  const [target, setTarget] = useState<ChipTarget | null>(null);
  const open = (name: string, element: HTMLElement) => setTarget({ name, rect: element.getBoundingClientRect() });
  return <main className="p-8">
    <h1 className="mb-4 text-lg font-semibold">Null organization prompt block harness</h1>
    <div className="flex gap-3">
      <Button onClick={(event) => open("kind-agent-mandate-specification", event.currentTarget)}>Open organization-only block</Button>
      <Button onClick={(event) => open("audio-placeholder", event.currentTarget)}>Open system block</Button>
    </div>
    <BlockChipPanel target={target} declared organizationId={null} onDeclare={async () => undefined} onClose={() => setTarget(null)} onChanged={() => undefined} />
  </main>;
}
