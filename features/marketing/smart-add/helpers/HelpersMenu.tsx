"use client";

/**
 * Smart Add "Helpers" menu: opens one focused-session window per people-search method. The page stays
 * calm — helpers live in this menu only. Person flow: every method; company flow: the by-name account
 * searches and Google (LinkedIn people and Grok people search for a person only).
 */
import { LifeBuoy } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOpenSmartAddHelper } from "@/features/overlays/openers/smartAddHelperWindow";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import { HELPER_LABELS, type HelperMethod } from "./types";

const PERSON: HelperMethod[] = ["linkedin", "google", "facebook", "instagram", "threads", "tiktok", "youtube"];
const COMPANY: HelperMethod[] = ["google", "threads", "tiktok", "youtube"];
export const MARK: Record<HelperMethod, string> = {
  linkedin: "linkedin",
  google: "website",
  threads: "threads",
  tiktok: "tiktok",
  youtube: "youtube",
  grok: "x",
  facebook: "facebook",
  instagram: "instagram",
};

export function HelpersMenu({ person }: { person: boolean }) {
  const open = useOpenSmartAddHelper();
  const list = person ? PERSON : COMPANY;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" icon={<LifeBuoy aria-hidden />} data-testid="smart-add-helpers">
          Helpers
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {list.map((m) => (
          <DropdownMenuItem key={m} onSelect={() => open(m)} data-testid={`smart-add-helper-open-${m}`}>
            <PlatformMark platform={MARK[m]} size={14} />
            {HELPER_LABELS[m]}
          </DropdownMenuItem>
        ))}
        {person ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => open("grok")} data-testid="smart-add-helper-open-grok">
              <PlatformMark platform="x" size={14} />
              {HELPER_LABELS.grok}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
