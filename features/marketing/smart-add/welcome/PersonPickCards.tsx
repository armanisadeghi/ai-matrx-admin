"use client";

/**
 * Sign-up welcome — "Which one is you?" (SIGNUP-WELCOME.md step 4; smart-add VISION Part 29). The anchor round's
 * candidates, grouped into people by peopleGroups.ts, as big calm cards: the raw photo, the name, one line, the place
 * and the platform marks of that person's accounts. The whole card is one press (`onPick`). One quiet way out under
 * the cards, "None of these", opens one field (city or company) that narrows the next round (`onNarrow`).
 * One person: "Is this you?" with That's me / Not me (Not me opens the same field).
 */

import { useRef, useState } from "react";
import { Check, MapPin, Search, X } from "lucide-react";
import { Button, Field } from "@ai-matrx/design-system/controls";
import { browserImageUrl } from "@/lib/media/external-image";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import { avatarInitial } from "../avatarInitial";
import found from "../found/found.module.css";
import type { PersonGroup } from "./peopleGroups";
import styles from "./welcome.module.css";

function PersonPhoto({ person, size }: { person: PersonGroup; size: string }) {
  const photo = person.photo;
  const fallback = (
    <span className="flex size-full items-center justify-center bg-foreground text-2xl font-semibold text-background">
      {avatarInitial(person.name)}
    </span>
  );
  return (
    <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-background`}>
      {photo?.profileId ? (
        <SocialImage door={profileAvatarDoor(photo.profileId)} url={photo.url} fallback={fallback} className="size-full object-cover" />
      ) : photo?.url ? (
        <img src={browserImageUrl(photo.url)} alt="" className="size-full object-cover" />
      ) : (
        fallback
      )}
    </span>
  );
}

/** One mark per platform the person is on (a site shows the site mark). */
function platformsOf(person: PersonGroup): string[] {
  return [...new Set(person.accounts.map((a) => (a.field === "website" ? "website" : (a.platform ?? ""))).filter(Boolean))];
}

function PersonFacts({ person, large }: { person: PersonGroup; large?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span
        className={`min-w-0 break-words font-semibold leading-[1.1] tracking-[-0.02em] text-foreground ${
          large ? "text-[1.85rem] sm:text-[2.2rem]" : "text-[1.5rem] sm:text-[1.65rem]"
        }`}
      >
        {person.name}
      </span>
      {/* Wraps at words (two lines at most), never cut inside a word (live 2026-10-21: "Innoviva Specialty Th..."). */}
      {person.line ? <span className="line-clamp-2 break-normal text-base text-foreground">{person.line}</span> : null}
      {person.place ? (
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{person.place}</span>
        </span>
      ) : null}
    </span>
  );
}

function PlatformRow({ person }: { person: PersonGroup }) {
  return (
    <span className="flex flex-wrap items-center gap-2.5">
      {platformsOf(person).map((p) => (
        <PlatformMark key={p} platform={p} size={20} />
      ))}
    </span>
  );
}

function PersonCard({ person, onPick }: { person: PersonGroup; onPick: (person: PersonGroup) => void }) {
  const label = [person.name, person.line, person.place].filter(Boolean).join(", ");
  return (
    <li className="min-w-0">
      <button
        type="button"
        data-clickable
        data-testid="welcome-person-card"
        aria-label={label}
        onClick={() => onPick(person)}
        className={`${styles.pick} flex h-full w-full items-start gap-4 rounded-3xl p-5 text-left sm:min-h-[13.5rem] sm:flex-col sm:p-6`}
      >
        <PersonPhoto person={person} size="size-16 sm:size-20" />
        <span className="flex min-w-0 flex-1 flex-col gap-3 self-stretch sm:gap-4">
          <PersonFacts person={person} />
          <span className="sm:mt-auto">
            <PlatformRow person={person} />
          </span>
        </span>
      </button>
    </li>
  );
}

/** One field (city or company) that narrows the next round; also the welcome's "nothing found" frame. */
export function NarrowField({ onNarrow }: { onNarrow: (text: string) => void }) {
  const [text, setText] = useState("");
  const field = useRef<HTMLInputElement>(null);
  // "Search again" is never a dead grey control (live 2026-10-21: grey text on a grey fill): pressed with nothing
  // typed, it puts the cursor in the field instead.
  return (
    <form
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (t) onNarrow(t);
        else field.current?.focus();
      }}
    >
      <Field
        ref={field}
        // ui-exception: a short raw value (a city or a company name) that narrows the next search
        hero
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="City or company"
        aria-label="City or company"
        data-testid="welcome-narrow-field"
        className="min-w-0 flex-1"
      />
      <Button type="submit" variant="primary" hero icon={<Search aria-hidden />} data-testid="welcome-narrow-submit">
        Search again
      </Button>
    </form>
  );
}

/**
 * "Which one is you?" while its people are still coming (a narrowed round searching, or the photo groups being read):
 * the same panel and title, two cards' worth of the waiting sweep. Never a found view for nobody.
 */
export function PersonPickWaiting() {
  return (
    <section
      className={`${found.panel} mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-[2rem] p-4 sm:gap-7 sm:p-8`}
      aria-labelledby="welcome-people-waiting-title"
      aria-busy
      data-testid="welcome-people-waiting"
    >
      <h1 id="welcome-people-waiting-title" className="px-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[2.25rem]">
        Which one is you?
      </h1>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" aria-hidden>
        {[0, 1].map((n) => (
          <li key={n} className={`${found.waiting} h-[8.5rem] rounded-3xl sm:h-[13.5rem]`} />
        ))}
      </ul>
    </section>
  );
}

export function PersonPickCards({
  people,
  more = 0,
  onPick,
  onNarrow,
}: {
  /** Distinct people, strongest first (peopleGroups). */
  people: PersonGroup[];
  /** People found but not shown. */
  more?: number;
  onPick: (person: PersonGroup) => void;
  onNarrow: (text: string) => void;
}) {
  const [narrowing, setNarrowing] = useState(false);
  const single = people.length === 1 ? people[0] : null;
  if (!people.length) return null;
  return (
    <section
      className={`${found.panel} mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-[2rem] p-4 sm:gap-7 sm:p-8`}
      aria-labelledby="welcome-people-title"
      data-testid="welcome-people"
      data-count={people.length}
    >
      <h1 id="welcome-people-title" className="px-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[2.25rem]">
        {single ? "Is this you?" : "Which one is you?"}
      </h1>

      {single ? (
        <div className={`${styles.single} flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-7`} data-testid="welcome-person-single">
          <PersonPhoto person={single} size="size-24 sm:size-28" />
          <span className="flex min-w-0 flex-1 flex-col gap-3">
            <PersonFacts person={single} large />
            <PlatformRow person={single} />
          </span>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} onPick={onPick} />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 px-1">
        {single ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" hero icon={<Check aria-hidden />} onClick={() => onPick(single)} data-testid="welcome-person-yes">
              That&apos;s me
            </Button>
            <Button
              variant="quiet"
              hero
              icon={<X aria-hidden />}
              aria-expanded={narrowing}
              onClick={() => setNarrowing((v) => !v)}
              data-testid="welcome-person-no"
            >
              Not me
            </Button>
          </div>
        ) : (
          // Opens the field (aria-expanded), never a toggle in a set: `pressed` dropped its ink to muted grey on the grey
          // card in dark mode (live 2026-10-21).
          <Button
            variant="quiet"
            className="self-start"
            aria-expanded={narrowing}
            meta={more > 0 ? `${more} more` : undefined}
            onClick={() => setNarrowing((v) => !v)}
            data-testid="welcome-none-of-these"
          >
            None of these
          </Button>
        )}
        {narrowing ? <NarrowField onNarrow={onNarrow} /> : null}
      </div>
    </section>
  );
}
