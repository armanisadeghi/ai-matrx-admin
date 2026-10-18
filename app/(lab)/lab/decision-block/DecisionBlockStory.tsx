"use client";

// The chat's <decision> block with real-shaped options (the note's own example plus a longer one),
// so its look is checkable without a signed-in chat. Picking shows what replaced the block.
import { useState } from "react";
import InlineDecisionBlock from "@/components/mardown-display/blocks/inline-decision/InlineDecisionBlock";

const HEADLINE = {
  id: "d-headline",
  prompt: "Which headline?",
  options: [
    { id: "direct", label: "Direct", text: "Cut your hiring time in half." },
    { id: "question", label: "Question", text: "What would you do with two extra weeks?" },
  ],
};

const OPENING = {
  id: "d-opening",
  prompt: "Which opening paragraph should the launch email use?",
  options: [
    {
      id: "story",
      label: "Customer story",
      text: "Last spring, Maria ran her bakery's hiring out of a shoebox of paper applications. Today she fills a shift in an afternoon. Here is what changed.",
    },
    {
      id: "numbers",
      label: "By the numbers",
      text: "Teams on our platform hire 2.1x faster and keep new staff 30% longer. This month we are opening it to every small business.",
    },
    {
      id: "plain",
      label: "Plain announcement",
      text: "Starting today, you can post a job, screen applicants and book interviews from one page.",
    },
  ],
};

function Slot({ decision }: { decision: typeof HEADLINE }) {
  const [chosen, setChosen] = useState<string | null>(null);
  if (chosen) return <p className="text-sm text-foreground">{chosen}</p>;
  return (
    <InlineDecisionBlock
      decision={decision}
      rawXml="<decision/>"
      onResolve={(_id, _raw, text) => setChosen(text)}
    />
  );
}

export function DecisionBlockStory() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 bg-textured p-6">
      <Slot decision={HEADLINE} />
      <Slot decision={OPENING} />
    </main>
  );
}
