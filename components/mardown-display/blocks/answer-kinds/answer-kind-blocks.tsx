"use client";

/**
 * Canonical components for the answer-action kinds: `contact` and `event`.
 *
 * Each is THE one renderer for its kind and carries the one action that makes the content real:
 *  - `contact`: "Save contact", the governed CRM save dialog (`useBlockMakeReal().saveAsContact`).
 *  - `event`:   "Add to calendar", an importable `.ics` from the platform builder (`downloadIcs`).
 * serverData is the streaming `{ value, isComplete }` bridge output or a bare kind value, both
 * coerced by `readSearchKindValue`; every field read is defensive because values are partial
 * mid-stream. Every card carries the Copy / Copy-for-AI pair.
 */

import React, { useMemo } from "react";
import { CalendarPlus, Clock, ExternalLink, Globe, Mail, MapPin, Phone, UserPlus } from "lucide-react";

import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { Button } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { downloadIcs } from "@/lib/calendar/eventLinks";
import { useBlockMakeReal } from "@/features/rich-content-host/block-make-real";
import { readSearchKindValue, text } from "../search-kinds/search-kind-data";
import { eventText, eventToCalendar } from "./event-calendar";

interface AnswerKindBlockProps {
  serverData?: unknown;
  className?: string;
}

const FRAME = "my-2 rounded-lg border border-border bg-card p-3";
const LINK = "break-words text-primary underline-offset-2 hover:underline";

/** The contact as the signature-style text the save dialog's parser reads. */
export function contactText(c: {
  name?: string | null;
  title?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}): string {
  return [c.name, c.title, c.organization, c.email, c.phone, c.website, c.address]
    .filter((line): line is string => typeof line === "string" && line.trim() !== "")
    .join("\n");
}

function webHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// contact
// ─────────────────────────────────────────────────────────────────────────────

export function ContactBlock({ serverData, className }: AnswerKindBlockProps) {
  const { value } = readSearchKindValue<"contact">(serverData);
  const makeReal = useBlockMakeReal();
  const name = text(value.name);
  const title = text(value.title);
  const organization = text(value.organization);
  const email = text(value.email);
  const phone = text(value.phone);
  const website = text(value.website);
  const address = text(value.address);
  const notes = text(value.notes);
  const asText = useMemo(
    () => contactText({ name, title, organization, email, phone, website, address }),
    [name, title, organization, email, phone, website, address],
  );
  const empty = !name && !email && !phone;

  return (
    <div className={cn(FRAME, className)} data-kind-block="contact">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{name ?? "Contact"}</p>
          {title || organization ? (
            <p className="break-words text-xs text-muted-foreground">
              {[title, organization].filter(Boolean).join(" at ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButtons
            label={name ?? "Contact"}
            size="xs"
            human={() => asText}
            json={() => value}
            agent={() => ({
              kind: "contact",
              location: "Chat",
              description: "A contact an answer named",
              data: value,
              summary: name ?? "Contact",
            })}
            hide={["export"]}
          />
          <Button
            variant="quiet"
            icon={<UserPlus />}
            disabled={empty}
            onClick={() => makeReal.saveAsContact(asText)}
          >
            <span>Save contact</span>
          </Button>
        </div>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-foreground">
        {email ? (
          <li className="flex items-start gap-1.5">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a className={LINK} href={`mailto:${email}`}>{email}</a>
          </li>
        ) : null}
        {phone ? (
          <li className="flex items-start gap-1.5">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a className={LINK} href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
          </li>
        ) : null}
        {website ? (
          <li className="flex items-start gap-1.5">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a className={LINK} href={webHref(website)} target="_blank" rel="noopener noreferrer">{website}</a>
          </li>
        ) : null}
        {address ? (
          <li className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="break-words">{address}</span>
          </li>
        ) : null}
      </ul>
      {notes ? <p className="mt-2 break-words text-xs text-muted-foreground">{notes}</p> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// event
// ─────────────────────────────────────────────────────────────────────────────

function whenLabel(start: string | null, end: string | null, zone: string | null): string | null {
  if (!start) return null;
  const clock = /\d{1,2}:\d{2}/.test(start);
  const a = new Date(start);
  if (Number.isNaN(a.getTime())) return start;
  const opts: Intl.DateTimeFormatOptions = clock
    ? { dateStyle: "full", timeStyle: "short", ...(zone ? { timeZone: zone } : {}) }
    : { dateStyle: "full" };
  try {
    const first = a.toLocaleString(undefined, opts);
    const b = end ? new Date(end) : null;
    if (clock && b && !Number.isNaN(b.getTime())) {
      return `${first} to ${b.toLocaleTimeString(undefined, { timeStyle: "short", ...(zone ? { timeZone: zone } : {}) })}`;
    }
    return first;
  } catch {
    return start;
  }
}

export function EventBlock({ serverData, className }: AnswerKindBlockProps) {
  const { value } = readSearchKindValue<"event">(serverData);
  const title = text(value.title);
  const start = text(value.start);
  const end = text(value.end);
  const zone = text(value.time_zone);
  const location = text(value.location);
  const description = text(value.description);
  const url = text(value.url);
  const calendarEvent = useMemo(() => eventToCalendar(value), [value]);
  const when = whenLabel(start, end, zone);

  const addToCalendar = () => {
    if (!calendarEvent) {
      toast.error("This event has no exact date, so there is nothing to add to a calendar.");
      return;
    }
    downloadIcs(calendarEvent);
    toast.success("Event saved for your calendar.");
  };

  return (
    <div className={cn(FRAME, className)} data-kind-block="event">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{title ?? "Event"}</p>
          {when ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-words">{when}</span>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButtons
            label={title ?? "Event"}
            size="xs"
            human={() => eventText(value)}
            json={() => value}
            agent={() => ({
              kind: "event",
              location: "Chat",
              description: "A calendar event an answer named",
              data: value,
              summary: title ?? "Event",
            })}
            hide={["export"]}
          />
          <Button variant="quiet" icon={<CalendarPlus />} disabled={!calendarEvent} onClick={addToCalendar}>
            <span>Add to calendar</span>
          </Button>
        </div>
      </div>
      {location ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="break-words">{location}</span>
        </p>
      ) : null}
      {description ? <p className="mt-2 break-words text-xs text-muted-foreground">{description}</p> : null}
      {url && /^https?:\/\//i.test(url) ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs">
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <a className={LINK} href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        </p>
      ) : null}
    </div>
  );
}
