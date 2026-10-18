"use client";

/**
 * MEET MATRX — the introduction a new person sees on the sign-up welcome (/welcome), and can reopen
 * any time from the user menu (/meet-matrx). Arman, 2026-10-17 (agent-creation-studio VISION):
 * "Meet Matrx", then the three studios, then the key pieces, each with a short pitch.
 *
 * Names are the canonical vocabulary (common-docs platform/vocabulary/FEATURE.md) — never coin or
 * rename one here. Pitches are 3–7 plain words (guarded in __tests__). Each piece links to its real
 * home. Each piece wears its ONE identity (colour + icon) from `@ai-matrx/icons/domain` — the same
 * tile it wears on the welcome grid, the dashboard and in chat; never a local colour. Knowledge's pitch speaks for ALL of a person's or company's information (notes, files, chats, research,
 * scrapes, code, tasks — not just files) that every agent can reach and never forgets (Arman, 2026-10-18). The card is the stage's `featured` hero (a picture of what flows in). The stage itself is `@ai-matrx/design-system/intro-stage` (one UI system).
 */
import type { ReactNode } from "react";
import { IntroStage, type IntroGroup } from "@ai-matrx/design-system/intro-stage";
import { PLATFORM_IDENTITIES as P, PRIMITIVE_IDENTITIES } from "@ai-matrx/icons/domain";
import AppLink from "@/components/navigation/AppLink";
import { WORKFLOWS_APP_URL } from "@/features/shell/constants/nav-data";

export const MEET_MATRX_PATH = "/meet-matrx";

export const MEET_MATRX_LEAD = "Three studios to build with. Six pieces to build from.";

/**
 * What Knowledge really takes in (aidream auto_ingest `SourceKind`, 2026-10-18): only kinds the
 * system ingests today. Guarded in __tests__ — add a kind here only when it is ingested for real.
 * Chats = `cx_message` (the conversation pipeline), People = the Knowledge Graph's entities.
 */
export const KNOWLEDGE_FLOW = ["Notes", "Documents", "Chats", "Web pages", "Sheets", "Research", "Tasks", "People"] as const;

export const MEET_MATRX_GROUPS: IntroGroup[] = [
  {
    id: "studios",
    label: "The studios",
    size: "feature",
    items: [
      { id: "agent-studio", name: "Agent Studio", pitch: "Turn your know\u2011how into an agent", href: "/agents/new/studio", identity: P.agent_studio, diagram: "single" },
      { id: "orchestra-studio", name: "Orchestra Studio", pitch: "Agents working together, led by a Conductor", href: "/agents/orchestra-studio", identity: P.orchestra_studio, diagram: "ensemble" },
      { id: "workflow-studio", name: "Workflow Studio", pitch: "Your process, run step by step", href: WORKFLOWS_APP_URL, external: true, identity: P.workflow_studio, diagram: "sequence" },
    ],
  },
  {
    id: "blocks",
    label: "The building blocks",
    size: "compact",
    items: [
      {
        id: "knowledge",
        name: "Knowledge",
        pitch: "All your information in one place. Your agents know all of it, always.",
        href: "/knowledge/hub",
        identity: PRIMITIVE_IDENTITIES.knowledge,
        featured: true,
        flow: KNOWLEDGE_FLOW,
        flowTo: "Every agent",
      },
      { id: "mandates", name: "Mandates", pitch: "Name the job. Choose who does it.", href: "/mandates", identity: P.mandates },
      { id: "applets", name: "Applets", pitch: "Package your AI for anyone to use", href: "/applets", identity: P.applets },
      { id: "boards", name: "Boards", pitch: "All your work on one canvas", href: "/board", identity: P.boards },
      { id: "custom-data", name: "Custom data", pitch: "Your own tables, shaped your way", href: "/data", identity: PRIMITIVE_IDENTITIES.data },
      { id: "tools", name: "Tools & Connectors", pitch: "Plug agents into the apps you use", href: "/agent-connections", identity: P.tools },
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
