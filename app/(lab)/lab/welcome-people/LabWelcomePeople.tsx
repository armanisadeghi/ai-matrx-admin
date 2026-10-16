"use client";

import { useState } from "react";
import { PersonPickCards } from "@/features/marketing/smart-add/welcome/PersonPickCards";
import { peopleGroups } from "@/features/marketing/smart-add/welcome/peopleGroups";
import { NICOLE_LONG, ROCHELLE_MOULTON } from "@/features/marketing/smart-add/welcome/fixtures/anchorFixtures";

const nicole = peopleGroups(NICOLE_LONG.items, NICOLE_LONG.searchedName);
const rochelle = peopleGroups(ROCHELLE_MOULTON.items, ROCHELLE_MOULTON.searchedName);

/** Lab chrome only: both stories stacked, and the last answer either one gave. */
export function LabWelcomePeople() {
  const [last, setLast] = useState("");
  return (
    <main className="flex min-h-dvh flex-col gap-10 px-4 py-8 sm:py-12">
      <PersonPickCards
        people={nicole.people}
        more={nicole.more}
        onPick={(p) => setLast(`Picked ${p.name}: ${p.accounts.map((a) => a.key).join(", ")}`)}
        onNarrow={(t) => setLast(`Narrow Nicole Long by "${t}"`)}
      />
      <PersonPickCards
        people={rochelle.people}
        more={rochelle.more}
        onPick={(p) => setLast(`Picked ${p.name}: ${p.accounts.map((a) => a.key).join(", ")}`)}
        onNarrow={(t) => setLast(`Narrow Rochelle Moulton by "${t}"`)}
      />
      <p className="mx-auto w-full max-w-4xl px-1 text-sm text-muted-foreground" data-testid="lab-welcome-last" aria-live="polite">
        {last || "No answer yet"}
      </p>
    </main>
  );
}
