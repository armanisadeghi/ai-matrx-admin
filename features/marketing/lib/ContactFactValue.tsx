"use client";

/**
 * A brand fact, discovery item or Smart Add finding whose kind is a way to reach someone (email,
 * phone, fax, address, website, a social profile) drawn with THE canonical contact values from
 * @ai-matrx/design-system. Social kinds are stored as `social_*` (`social_profile`, `social_linkedin`).
 */
import type { ReactNode } from "react";

import { ContactValue, type ContactValueType } from "@ai-matrx/design-system";

/** The contact value type a fact kind renders as; null = not a contact kind (plain text). */
export function contactTypeOfKind(kind: string | null | undefined): ContactValueType | null {
  const k = (kind ?? "").trim().toLowerCase();
  if (k === "email") return "email";
  if (k === "phone" || k === "fax") return "phone";
  if (k === "address") return "address";
  if (k === "website" || k === "url") return "url";
  if (k.startsWith("social_")) return "social";
  return null;
}

/** The platform a `social_<platform>` kind names (`social_profile` names none). */
function platformOfKind(kind: string): string | null {
  const rest = kind.trim().toLowerCase().replace(/^social_/, "");
  return rest && rest !== "profile" ? rest : null;
}

/**
 * The value as its contact component, its clicks kept off the row it sits in; null when the kind is
 * not a contact kind or the value is empty (the caller draws plain text).
 */
export function contactFactValue({
  kind,
  value,
  owner,
  platform,
  className,
}: {
  kind: string | null | undefined;
  value: string | null | undefined;
  owner?: string | null;
  platform?: string | null;
  className?: string;
}): ReactNode | null {
  const type = contactTypeOfKind(kind);
  const text = (value ?? "").trim();
  if (!type || !text) return null;
  return (
    <span
      className={className ?? "inline-flex min-w-0 max-w-full"}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ContactValue
        type={type}
        value={text}
        owner={owner ?? undefined}
        platform={type === "social" ? (platform ?? platformOfKind(kind ?? "")) : undefined}
      />
    </span>
  );
}
