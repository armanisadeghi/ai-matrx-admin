/**
 * Small presentational pieces the six news kind views share. Semantic tokens
 * only; no wrappers around a host's chrome (each view is the chrome).
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { Chip, type ChipTone, PropertyRow } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export function KindCard({
  title,
  subtitle,
  children,
  testId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section
      className="my-2 flex flex-col gap-2 rounded-md border border-border bg-card p-3"
      data-testid={testId}
    >
      <header className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

const PILL_TONE = {
  neutral: "neutral",
  good: "success",
  warn: "warning",
  bad: "destructive",
  info: "primary",
} as const satisfies Record<string, ChipTone>;

/** A pill's children are text runs (`window {decay}`); the chip takes one line. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

export function Pill({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  title?: string;
}) {
  return <Chip tone={PILL_TONE[tone]} label={textOf(children)} title={title} />;
}

/** An app-internal path opens in place; anything else opens a new tab. */
export function SmartLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={cn("text-primary hover:underline", className)}>
        {children}
      </Link>
    );
  }
  return (
    <OutboundLink
      href={href}
      className={cn(
        "inline-flex items-center gap-0.5 text-primary hover:underline",
        className,
      )}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </OutboundLink>
  );
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return "no date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The news-monitor fact row IS the shared label/value row. */
export const FactRow = PropertyRow;
