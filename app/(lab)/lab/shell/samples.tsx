"use client";

// STATIC sample content for the frame playground — believable, never real data.
import { ArrowUp, FileText, MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ai-matrx/design-system";
import { Badge, Button, PropertyRow } from "@ai-matrx/design-system/controls";

export interface SampleContact {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  stage: "Customer" | "Lead" | "Prospect";
  owner: string;
  lastTouch: string;
}

export const CONTACTS: readonly SampleContact[] = [
  { id: "c1", name: "Marisol Okonkwo", company: "Okonkwo Dental Group", role: "Practice owner", email: "marisol@okonkwodental.com", phone: "(949) 555-0142", stage: "Customer", owner: "Dana Whitfield", lastTouch: "2 days ago" },
  { id: "c2", name: "Theo Lindqvist", company: "Northbay Logistics", role: "Operations lead", email: "theo.l@northbaylog.com", phone: "(415) 555-0178", stage: "Lead", owner: "Arjun Mehta", lastTouch: "Yesterday" },
  { id: "c3", name: "Priya Raman", company: "Raman & Cole LLP", role: "Managing partner", email: "praman@ramancole.law", phone: "(213) 555-0109", stage: "Customer", owner: "Dana Whitfield", lastTouch: "Today" },
  { id: "c4", name: "Gus Albrecht", company: "Albrecht HVAC", role: "Owner", email: "gus@albrechthvac.com", phone: "(714) 555-0163", stage: "Prospect", owner: "Lena Park", lastTouch: "1 week ago" },
  { id: "c5", name: "Naomi Feld", company: "Feld Physical Therapy", role: "Clinic director", email: "naomi@feldpt.com", phone: "(949) 555-0127", stage: "Lead", owner: "Arjun Mehta", lastTouch: "3 days ago" },
  { id: "c6", name: "Rafael Duarte", company: "Duarte Builders", role: "Estimator", email: "rafael@duartebuild.com", phone: "(562) 555-0191", stage: "Customer", owner: "Lena Park", lastTouch: "Today" },
  { id: "c7", name: "Imogen Hale", company: "Hale Interiors", role: "Founder", email: "imogen@haleinteriors.co", phone: "(310) 555-0155", stage: "Prospect", owner: "Dana Whitfield", lastTouch: "2 weeks ago" },
  { id: "c8", name: "Kenji Watanabe", company: "Watanabe Optometry", role: "Office manager", email: "kenji@watanabeoptometry.com", phone: "(626) 555-0137", stage: "Lead", owner: "Lena Park", lastTouch: "4 days ago" },
];

const STAGE_TONE = { Customer: "success", Lead: "info", Prospect: "neutral" } as const;

export function ContactList({
  rows,
  phone,
  onOpen,
}: {
  rows: readonly SampleContact[];
  phone: boolean;
  onOpen: (c: SampleContact) => void;
}) {
  if (phone) {
    return (
      <ul>
        {rows.map((c) => (
          <li key={c.id} className="mf-rule-b">
            <button
              type="button"
              data-clickable
              onClick={() => onOpen(c)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
            >
              <span className="min-w-0 flex-1">
                <span className="type-title block truncate">{c.name}</span>
                <span className="type-secondary block truncate text-muted-foreground">{c.company}</span>
              </span>
              <Badge tone={STAGE_TONE[c.stage]}>{c.stage}</Badge>
            </button>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="pr-6">Last touch</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} data-clickable onClick={() => onOpen(c)}>
            <TableCell className="pl-6">
              <button type="button" className="type-title text-left hover:underline" onClick={() => onOpen(c)}>
                {c.name}
              </button>
            </TableCell>
            <TableCell className="text-muted-foreground">{c.company}</TableCell>
            <TableCell>
              <Badge tone={STAGE_TONE[c.stage]}>{c.stage}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{c.owner}</TableCell>
            <TableCell className="pr-6 text-muted-foreground">{c.lastTouch}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ContactRecord({ contact }: { contact: SampleContact }) {
  return (
    <article className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="type-title flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          {contact.name
            .split(" ")
            .map((p) => p[0])
            .join("")}
        </span>
        <div className="min-w-0">
          <p className="type-title truncate">{contact.name}</p>
          <p className="type-secondary truncate text-muted-foreground">
            {contact.role} · {contact.company}
          </p>
        </div>
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="type-title">Latest activity</h3>
        <ul className="flex flex-col">
          {[
            ["Call logged", "Asked about adding a second location", contact.lastTouch],
            ["Email sent", "Proposal for the spring package", "Last week"],
            ["Meeting", "Intro call with the front-desk team", "3 weeks ago"],
          ].map(([title, line, when]) => (
            <li key={title} className="mf-rule-b flex items-baseline gap-3 py-2.5">
              <span className="type-title shrink-0">{title}</span>
              <span className="type-body min-w-0 flex-1 truncate text-muted-foreground">{line}</span>
              <span className="type-meta shrink-0 text-muted-foreground">{when}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="type-title">Notes</h3>
        <p className="type-body">
          Prefers mornings. Decision maker for software purchases; budget review happens each
          quarter. Interested in the reminders add-on once the second location opens.
        </p>
      </section>
    </article>
  );
}

export function ContactProperties({ contact }: { contact: SampleContact }) {
  return (
    <div className="flex flex-col gap-4">
      <PropertyRow label="Stage" value={<Badge tone={STAGE_TONE[contact.stage]}>{contact.stage}</Badge>} />
      <PropertyRow label="Email" value={contact.email} />
      <PropertyRow label="Phone" value={contact.phone} />
      <PropertyRow label="Company" value={contact.company} />
      <PropertyRow label="Owner" value={contact.owner} />
      <PropertyRow label="Source" missing />
    </div>
  );
}

export const DOCS = [
  { id: "d1", title: "Onboarding checklist for new clinics", folder: "Company handbook", edited: "10 min ago", kind: "Document" },
  { id: "d2", title: "Q4 pricing notes", folder: "Drafts", edited: "Yesterday", kind: "Note" },
  { id: "d3", title: "Spring package pitch", folder: "Client work", edited: "2 days ago", kind: "Slides" },
  { id: "d4", title: "Front-desk phone script", folder: "Company handbook", edited: "Last week", kind: "Document" },
] as const;

export function DocList({ phone, onOpen }: { phone: boolean; onOpen: () => void }) {
  return (
    <ul>
      {DOCS.map((d) => (
        <li key={d.id} className="mf-rule-b">
          <button
            type="button"
            data-clickable
            onClick={onOpen}
            className={`flex w-full items-center gap-3 py-2.5 text-left hover:bg-accent ${phone ? "px-4" : "px-6"}`}
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="type-title min-w-0 flex-1 truncate">{d.title}</span>
            {!phone ? <span className="type-secondary w-40 truncate text-muted-foreground">{d.folder}</span> : null}
            <span className="type-meta w-20 shrink-0 text-right text-muted-foreground">{d.edited}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function DocPage() {
  return (
    <article className="flex flex-col gap-4">
      <p className="type-title">Onboarding checklist for new clinics</p>
      <p className="type-body">
        Every new clinic goes through the same first two weeks. This page is the order we do it in
        and who owns each step.
      </p>
      <h3 className="type-title pt-2">Week one</h3>
      <ol className="type-body flex list-decimal flex-col gap-1.5 pl-5">
        <li>Kick-off call with the practice owner and front-desk lead.</li>
        <li>Import the patient list and confirm reminder preferences.</li>
        <li>Set up the intake form and send a test to the owner.</li>
      </ol>
      <h3 className="type-title pt-2">Week two</h3>
      <ol className="type-body flex list-decimal flex-col gap-1.5 pl-5">
        <li>Turn on appointment reminders for one provider.</li>
        <li>Review the first 20 replies together.</li>
        <li>Roll out to every provider and book the 30-day check-in.</li>
      </ol>
      <p className="type-body">
        If a step slips, note why in the clinic&apos;s CRM record so the next person sees it.
      </p>
    </article>
  );
}

const THREAD = [
  { who: "you", text: "Can you outline a quarterly plan for the two new clinics?" },
  {
    who: "agent",
    text: "Here is a three-month outline. Month one: onboarding and reminders for one provider at each clinic. Month two: roll out to every provider and launch the intake form. Month three: review reply rates and decide on the reminders add-on.",
  },
  { who: "you", text: "Make month two shorter and add a check-in with each owner." },
  {
    who: "agent",
    text: "Done. Month two is now two weeks, followed by a 30-minute check-in with each practice owner before month three starts.",
  },
] as const;

export function ChatThread() {
  return (
    <div className="flex flex-col gap-5">
      {THREAD.map((m, i) =>
        m.who === "you" ? (
          <div key={i} className="flex justify-end">
            <p className="type-body max-w-4/5 rounded-2xl bg-muted px-3.5 py-2">{m.text}</p>
          </div>
        ) : (
          <div key={i} className="flex gap-3">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="type-body">{m.text}</p>
          </div>
        ),
      )}
      <div className="mt-4 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 pl-4">
        <span className="type-body flex-1 py-1 text-muted-foreground">Message (sample composer)</span>
        <Button variant="primary" icon={<ArrowUp />} aria-label="Send" disabled />
      </div>
    </div>
  );
}

export function WorkspaceSample({ label }: { label: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      <span className="type-secondary rounded-md border border-border bg-card px-3 py-1.5 text-muted-foreground">
        {label} — edge-to-edge workspace body
      </span>
    </div>
  );
}
