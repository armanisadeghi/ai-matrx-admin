"use client";

/**
 * "Open it on <computer>": the computer's Sessions view loads its relay connection first, which can
 * take seconds — so the link says it is opening (Next's own link status) instead of sitting still.
 */
import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

function Label({ name }: { name: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center gap-1" aria-busy={pending}>
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {pending ? `Opening ${name}…` : `Open it on ${name}`}
    </span>
  );
}

export function OpenOnComputerLink({ href, name }: { href: string; name: string }) {
  return (
    <Link href={href} className="text-primary hover:underline" data-testid="open-on-computer">
      <Label name={name} />
    </Link>
  );
}

/** Inside any next/link: the idle label, or a spinner and the pending label while it navigates. */
export function PendingLinkLabel({ idle, pending: pendingText, icon }: { idle: string; pending: string; icon?: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center gap-1.5" aria-busy={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {pending ? pendingText : idle}
    </span>
  );
}
