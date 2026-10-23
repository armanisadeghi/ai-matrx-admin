"use client";

/**
 * The plain-language box at the top of the Data library: say what you want ("3-bed homes under $600k
 * in Austin"), and the library picks the task and the source, fills that source's form from the
 * words, and runs it. The reading is free and instant (`readAsk`); nothing is spent until the form
 * runs. A sentence it cannot place offers the two or three likely tasks and a way out — never a
 * guess that runs.
 */

import { useRef, useState } from "react";
import { createElement } from "react";
import { X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";

import { ProInput } from "@/components/official/ProInput";

import { CARD_OF_TASK, readAsk, type AskReading, type AskTask } from "../ask";
import { fillFromAsk, pickAskSource, type AskFill } from "../askFill";
import type { Library, LibrarySource } from "./catalog";
import { LIBRARY_TASKS, resolveTask, type LibraryTask } from "./tasks";

/**
 * What the box decided: open this source with this fill, and run it only when the fill is complete AND nothing the
 * person asked for was dropped. A dropped filter stops the run (review I-3): the form says what was not applied and
 * offers "Run anyway" or `alternative`, a source of the same task that takes everything asked.
 */
export interface AskPlan {
  task: LibraryTask;
  source: LibrarySource;
  fill: AskFill;
  run: boolean;
  alternative: AskPlan | null;
}

/** The plan for a task card and a reading, or null when the card has no source on this library. */
export function planFor(library: Library, cardId: string, reading: AskReading): AskPlan | null {
  const task = LIBRARY_TASKS.find((t) => t.id === cardId);
  if (!task) return null;
  const all = resolveTask(library, task).all;
  const source = pickAskSource(all);
  if (!source) return null;
  const fill = fillFromAsk(source, reading);
  const takesAll = (f: AskFill) => f.complete && f.unapplied.length === 0;
  let alternative: AskPlan | null = null;
  if (!takesAll(fill)) {
    for (const other of all) {
      if (other.key === source.key || other.knownIssue) continue;
      const otherFill = fillFromAsk(other, reading);
      if (takesAll(otherFill)) {
        alternative = { task, source: other, fill: otherFill, run: true, alternative: null };
        break;
      }
    }
  }
  return { task, source, fill, run: takesAll(fill), alternative };
}

/** The tasks to offer when the words do not settle on one: the guess first, then what else they fit, at most three. */
export function likelyTasks(reading: AskReading): LibraryTask[] {
  const tasks: AskTask[] = [reading.task, ...reading.alternatives].filter((t, i, all) => t !== "unknown" && all.indexOf(t) === i);
  const cards = tasks.map((t) => LIBRARY_TASKS.find((x) => x.id === CARD_OF_TASK[t])).filter((t): t is LibraryTask => Boolean(t));
  return (cards.length > 0 ? cards : LIBRARY_TASKS.slice(0, 3)).slice(0, 3);
}

/** Whether the reading is sure enough to open and run without asking. */
export function isSettled(reading: AskReading): boolean {
  if (reading.task === "unknown" || !reading.cardId) return false;
  return reading.confidence === "clear" || reading.alternatives.length === 0;
}

export function AskBox({
  library,
  organizationId,
  onPlan,
}: {
  library: Library;
  organizationId: string | null;
  onPlan: (plan: AskPlan, reading: AskReading) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [offer, setOffer] = useState<{ reading: AskReading; tasks: LibraryTask[] } | null>(null);
  const latest = useRef(0);

  const submit = async () => {
    const asked = text.trim();
    if (!asked || busy) return;
    const mine = ++latest.current;
    setBusy(true);
    setFailed(false);
    setOffer(null);
    try {
      const reading = await readAsk(asked, { organizationId: organizationId ?? undefined });
      if (mine !== latest.current) return;
      const plan = isSettled(reading) ? planFor(library, reading.cardId, reading) : null;
      if (plan) onPlan(plan, reading);
      else setOffer({ reading, tasks: likelyTasks(reading) });
    } catch {
      if (mine === latest.current) setFailed(true);
    } finally {
      if (mine === latest.current) setBusy(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-2" data-ask-box="">
      <ProInput
        value={text}
        placeholder="3-bed homes under $600k in Austin"
        enableCleanup={false}
        onChange={(e) => {
          setText(e.target.value);
          if (offer || failed) {
            setOffer(null);
            setFailed(false);
          }
        }}
        onSubmit={() => void submit()}
        submitOnEnter
        submitLabel="Find"
        submitDisabled={!text.trim()}
        isSubmitting={busy}
        aria-label="Describe what you want"
        data-field="ask"
      />
      {failed && <ErrorNotice message="Could not read that. Try again, or pick a task below." size="inline" />}
      {offer && (
        <div className="flex flex-col gap-2" role="group" aria-label="Pick a task" data-ask-offer="">
          <span className="text-xs font-medium text-muted-foreground">Which of these?</span>
          <div className="flex flex-wrap items-center gap-2">
            {offer.tasks.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                icon={createElement(t.icon, { className: "h-4 w-4" })}
                onClick={() => {
                  const plan = planFor(library, t.id, offer.reading);
                  if (plan) onPlan(plan, offer.reading);
                }}
                data-ask-choice={t.id}
              >
                {t.title}
              </Button>
            ))}
            <Button type="button" variant="quiet" icon={<X className="h-4 w-4" />} onClick={() => setOffer(null)} data-ask-way-out="">
              None of these
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
