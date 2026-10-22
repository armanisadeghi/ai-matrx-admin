"use client";

// The hero's primary action when it differs by audience: a visitor gets the
// pitch, a signed-in person gets their own door (or nothing — the shell header
// already carries "Open Study Hub", and one action gets one door).
// `selectIsAuthenticated` is seeded from the (core) layout's preloaded state,
// so the server and client render the same branch.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAuthenticated } from "@/lib/redux/selectors/userSelectors";
import type { EduLink } from "../../types";

export function EduHeroAudienceLink({
  guest,
  signedIn,
}: {
  guest: EduLink;
  signedIn: EduLink | null;
}) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const link = isAuthenticated ? signedIn : guest;
  if (!link) return null;
  return (
    <Button hero variant="primary" className="w-full sm:w-auto" asChild>
      <Link href={link.href}>
        {link.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}
