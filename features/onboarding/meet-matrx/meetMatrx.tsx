"use client";

/**
 * MEET MATRX — the introduction a new person sees on the sign-up welcome (/welcome), and can reopen
 * any time from the user menu (/meet-matrx). Arman, 2026-10-17 (agent-creation-studio VISION):
 * "Meet Matrx", then the three studios, then the key pieces, each with a short pitch.
 *
 * Names are the canonical vocabulary (common-docs platform/vocabulary/FEATURE.md) — never coin or
 * rename one here. Pitches are 3–7 plain words (guarded in __tests__). Each piece links to its real
 * home; Knowledge's pitch speaks for ALL of a person's or company's information (notes, files, chats, research,
 * scrapes, code, tasks — not just files) that every agent can reach and never forgets (Arman, 2026-10-18). The stage itself is `@ai-matrx/design-system/intro-stage` (one UI system).
 */
import type { ReactNode } from "react";
import { Database, LayoutGrid, Library, Network, Plug, Puzzle, Workflow } from "lucide-react";
import { IntroStage, type IntroGroup } from "@ai-matrx/design-system/intro-stage";
import AppLink from "@/components/navigation/AppLink";
import { AGENT_ICON, INTELLIGENCE_ICON } from "@/components/icons/domain-icons";
import { WORKFLOWS_APP_URL } from "@/features/shell/constants/nav-data";

export const MEET_MATRX_PATH = "/meet-matrx";

export const MEET_MATRX_LEAD = "Three studios to build with. Six pieces to build from.";

export const MEET_MATRX_GROUPS: IntroGroup[] = [
  {
    id: "studios",
    label: "The studios",
    size: "feature",
    items: [
      { id: "agent-studio", name: "Agent Studio", pitch: "Turn your know\u2011how into an agent", icon: <AGENT_ICON />, href: "/agents/new/studio", tone: 1, diagram: "single" },
      { id: "orchestra-studio", name: "Orchestra Studio", pitch: "Agents working together, led by a Conductor", icon: <Network />, href: "/agents/orchestra-studio", tone: 7, diagram: "ensemble" },
      { id: "workflow-studio", name: "Workflow Studio", pitch: "Your process, run step by step", icon: <Workflow />, href: WORKFLOWS_APP_URL, external: true, tone: 9, diagram: "sequence" },
    ],
  },
  {
    id: "blocks",
    label: "The building blocks",
    size: "compact",
    items: [
      { id: "mandates", name: "Mandates", pitch: "Name the job. Choose who does it.", icon: <INTELLIGENCE_ICON />, href: "/mandates", tone: 4 },
      { id: "applets", name: "Applets", pitch: "Package your AI for anyone to use", icon: <Puzzle />, href: "/applets", tone: 8 },
      { id: "boards", name: "Boards", pitch: "All your work on one canvas", icon: <LayoutGrid />, href: "/board", tone: 3 },
      { id: "custom-data", name: "Custom data", pitch: "Your own tables, shaped your way", icon: <Database />, href: "/data", tone: 6 },
      { id: "knowledge", name: "Knowledge", pitch: "Everything in one place. Agents never forget.", icon: <Library />, href: "/knowledge", tone: 5 },
      { id: "tools", name: "Tools & Connectors", pitch: "Plug agents into the apps you use", icon: <Plug />, href: "/agent-connections", tone: 2 },
    ],
  },
];

/** The Meet Matrx stage, with the app's router link. `children` = what follows it on the page. */
export function MeetMatrx({ eyebrow, children }: { eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <IntroStage
      eyebrow={eyebrow}
      title="Meet"
      accent="Matrx"
      lead={MEET_MATRX_LEAD}
      groups={MEET_MATRX_GROUPS}
      renderLink={({ item, href, className, style, children: body, ...rest }) =>
        item.external ? (
          <a href={href} className={className} style={style} target="_blank" rel="noopener noreferrer" data-intro-item={rest["data-intro-item"]}>
            {body}
          </a>
        ) : (
          <AppLink href={href} className={className} style={style} data-intro-item={rest["data-intro-item"]}>
            {body}
          </AppLink>
        )
      }
    >
      {children}
    </IntroStage>
  );
}
