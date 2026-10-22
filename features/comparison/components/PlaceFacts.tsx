"use client";

/**
 * The facts a place record carries beyond its headline numbers, read side by side: star counts, hours
 * (today first), contact and booking, closed / claimed, attributes and categories; plus each contender's
 * sample reviews on its card. Facts, never scores: nothing here ranks and none of it moves the headline.
 */

import { useEffect, useState } from "react";
import { Check, Minus, Phone } from "lucide-react";
import { Badge } from "@ai-matrx/design-system/controls";
import { DisclosureHeader } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

import { cn } from "@/lib/utils";

import type { CompareField, ComparedItem, ComparisonResult } from "../contract";
import {
  attributeGrid, contactOf, hoursToday, openNow, reviewsOf, starShares, statusOf, tagsOf, weekOf,
} from "../place-facts";
import { comparedItems } from "../verdict";
import { ItemLogo } from "./ItemLogo";

const isPhoto = (kind: string) => kind === "local_business" || kind === "products" || kind === "social_accounts";

/** The viewer's clock, read after mount so the server render and the first client render agree. */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);
  return now;
}

function Frame({ field, children }: { field: CompareField; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label={field.label}>
      <h2 className="type-title mb-3 text-foreground" title={field.help || undefined}>{field.label}</h2>
      {children}
    </section>
  );
}

function Who({ item, kind }: { item: ComparedItem; kind: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <ItemLogo name={item.name} logoUrl={item.logo_url} website={item.website} size={28} fill={isPhoto(kind)} />
      <span className="type-body truncate text-foreground" title={item.name}>{item.name}</span>
    </div>
  );
}

const STAR_TONES = ["bg-primary", "bg-primary/70", "bg-primary/40", "bg-destructive/50", "bg-destructive"];

function Distribution({ field, result }: { field: CompareField; result: ComparisonResult }) {
  return (
    <Frame field={field}>
      <ul className="space-y-4">
        {comparedItems(result).map((it) => {
          const s = starShares(it.values[field.key]?.value);
          return (
            <li key={it.item_id} className="space-y-1.5">
              <Who item={it} kind={result.kind} />
              {s ? (
                <>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img"
                    aria-label={it.values[field.key]?.display} title={it.values[field.key]?.display}>
                    {s.shares.map((share, i) => share > 0
                      ? <span key={i} className={cn("h-full", STAR_TONES[i])} style={{ width: `${share * 100}%` }} />
                      : null)}
                  </div>
                  <div className="type-meta tabular-nums text-muted-foreground">
                    {s.total.toLocaleString("en-US")} counted · 5★ {Math.round(s.shares[0] * 100)}% · 1★ {Math.round(s.shares[4] * 100)}%
                  </div>
                </>
              ) : <span className="type-body text-muted-foreground">—</span>}
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

function Hours({ field, result }: { field: CompareField; result: ComparisonResult }) {
  const now = useNow();
  return (
    <Frame field={field}>
      <ul className="space-y-3">
        {comparedItems(result).map((it) => <HoursRow key={it.item_id} item={it} field={field} kind={result.kind} now={now} />)}
      </ul>
    </Frame>
  );
}

function HoursRow({ item, field, kind, now }: { item: ComparedItem; field: CompareField; kind: string; now: Date | null }) {
  const [open, setOpen] = useState(false);
  const v = item.values[field.key];
  const week = weekOf(v?.value);
  const today = week && now ? hoursToday(week, now) : null;
  const status = today && now ? openNow(today.text, now) : null;
  return (
    <li className="space-y-1">
      <Who item={item} kind={kind} />
      {week ? (
        <>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-[2.375rem]">
            {today ? <span className="type-body text-foreground">Today {today.text}</span> : <span className="type-body text-muted-foreground">—</span>}
            {status !== null ? <Badge tone={status ? "success" : "neutral"}>{status ? "Open now" : "Closed"}</Badge> : null}
          </div>
          <div className="pl-[2.375rem]">
            <DisclosureHeader open={open} onClick={() => setOpen((o) => !o)} title="Full week" />
            {open ? (
              <dl className="mt-1 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-0.5">
                {week.map(([d, t]) => (
                  <div key={d} className="contents">
                    <dt className={cn("type-secondary", today?.day === d ? "text-foreground" : "text-muted-foreground")}>{d}</dt>
                    <dd className="type-secondary text-foreground">{t}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </>
      ) : (
        // older runs sent a one-line summary
        <div className="type-body pl-[2.375rem] text-foreground">{v && v.display !== "—" ? v.display : <span className="text-muted-foreground">—</span>}</div>
      )}
    </li>
  );
}

function Contact({ field, result }: { field: CompareField; result: ComparisonResult }) {
  return (
    <Frame field={field}>
      <ul className="space-y-3">
        {comparedItems(result).map((it) => {
          const c = contactOf(it.values[field.key]?.value);
          const link = "type-body inline-flex items-center gap-1 text-primary hover:underline";
          return (
            <li key={it.item_id} className="space-y-1">
              <Who item={it} kind={result.kind} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[2.375rem]">
                {c?.phone ? (
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className={link}><Phone className="h-3.5 w-3.5" aria-hidden />{c.phone}</a>
                ) : null}
                {c?.website ? <OutboundLink href={c.website} className={link}>Website</OutboundLink> : null}
                {c?.booking ? <OutboundLink href={c.booking} className={link}>Book online</OutboundLink> : null}
                {!c ? <span className="type-body text-muted-foreground">—</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

function ClosedBadge({ closed }: { closed: "permanently" | "temporarily" }) {
  return <Badge tone="destructive">{closed === "permanently" ? "Permanently closed" : "Temporarily closed"}</Badge>;
}

function Listing({ field, result }: { field: CompareField; result: ComparisonResult }) {
  return (
    <Frame field={field}>
      <ul className="space-y-3">
        {comparedItems(result).map((it) => {
          const s = statusOf(it.values[field.key]?.value);
          return (
            <li key={it.item_id} className="flex flex-wrap items-center justify-between gap-2">
              <Who item={it} kind={result.kind} />
              <div className="flex items-center gap-1.5">
                {s?.closed ? <ClosedBadge closed={s.closed} /> : null}
                {s?.claimed === true ? <Badge tone="success">Claimed</Badge> : s?.claimed === false ? <Badge>Not claimed</Badge> : null}
                {!s ? <span className="type-body text-muted-foreground">—</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

/** Attributes: a yes / no grid, every contender a column. Categories: each contender's own chips. */
function Tags({ field, result }: { field: CompareField; result: ComparisonResult }) {
  const items = comparedItems(result);
  if (field.key === "attributes") {
    const rows = attributeGrid(items, field.key);
    return (
      <Frame field={field}>
        <div className="grid items-center gap-x-3 gap-y-2" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${items.length}, 2.5rem)` }}>
          <span />
          {items.map((it) => (
            <span key={it.item_id} className="flex justify-center" title={it.name}>
              <ItemLogo name={it.name} logoUrl={it.logo_url} website={it.website} size={28} fill={isPhoto(result.kind)} />
            </span>
          ))}
          {rows.map((r) => (
            <div key={r.name} className="contents">
              <span className="type-body truncate text-foreground" title={r.name}>{r.name}</span>
              {r.has.map((yes, i) => (
                <span key={i} className="flex justify-center" title={`${items[i].name}: ${yes ? "Yes" : "No"}`}>
                  {yes ? <Check className="h-4 w-4 text-primary" aria-label="Yes" /> : <Minus className="h-4 w-4 text-disabled-foreground" aria-label="No" />}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Frame>
    );
  }
  return (
    <Frame field={field}>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.item_id} className="space-y-1.5">
            <Who item={it} kind={result.kind} />
            <div className="flex flex-wrap gap-1.5 pl-[2.375rem]">
              {tagsOf(it.values[field.key]?.value).map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** One rich field as its side-by-side card. */
export function RichField({ field, result }: { field: CompareField; result: ComparisonResult }) {
  switch (field.type) {
    case "distribution": return <Distribution field={field} result={result} />;
    case "hours": return <Hours field={field} result={result} />;
    case "contact": return <Contact field={field} result={result} />;
    case "status": return <Listing field={field} result={result} />;
    case "tags": return <Tags field={field} result={result} />;
    default: return null;
  }
}

/** Closed flags, shown over the photo so a dead listing is never missed. */
export function ClosedFlag({ item }: { item: ComparedItem }) {
  const s = statusOf(item.values.listing_status?.value);
  if (!s?.closed) return null;
  return <div className="absolute inset-x-2 bottom-2"><ClosedBadge closed={s.closed} /></div>;
}

/** The sample reviews and quotes the listing hands over, behind one disclosure on the card. */
export function ReviewsDisclosure({ item }: { item: ComparedItem }) {
  const [open, setOpen] = useState(false);
  const r = reviewsOf(item.values.review_samples?.value);
  if (!r) return null;
  return (
    <div>
      <DisclosureHeader open={open} onClick={() => setOpen((o) => !o)} title="Reviews" meta={String(r.top.length + r.snippets.length)} />
      {open ? (
        <ul className="mt-2 space-y-3">
          {r.top.map((t, i) => (
            <li key={i} className="space-y-0.5">
              <div className="type-meta text-muted-foreground">
                {[t.rating !== null ? `${t.rating}★` : null, t.by, t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null].filter(Boolean).join(" · ")}
              </div>
              <p className="type-body line-clamp-5 text-foreground" title={t.text}>{t.text}</p>
            </li>
          ))}
          {r.snippets.map((s, i) => <li key={`s${i}`} className="type-body text-foreground">{s}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
