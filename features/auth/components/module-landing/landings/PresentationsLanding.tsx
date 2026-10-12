import { Download, LayoutTemplate, MessageSquare, Palette, Presentation, Share2 } from "lucide-react";
import {
  ModuleLanding,
  type ModuleCapability,
  type ModuleStep,
  type ModuleSubArea,
} from "@/features/auth/components/module-landing/ModuleLanding";

const CAPABILITIES: ModuleCapability[] = [
  {
    icon: Presentation,
    title: "Slides you edit in place",
    description: "Click a title or a bullet and type. Title, section, bullets, two columns, image, quote and big-number layouts.",
  },
  {
    icon: Palette,
    title: "Ten designed themes",
    description: "Switch the whole deck's look in one click — every slide follows, nothing to restyle by hand.",
  },
  {
    icon: MessageSquare,
    title: "Decks from your agents",
    description: "Any deck an agent writes in chat saves to Presentations with one click, ready to edit and present.",
  },
  {
    icon: Download,
    title: "PowerPoint, PDF, web page",
    description: "Download a real .pptx, a PDF of every slide, or a standalone web page.",
  },
  {
    icon: Share2,
    title: "Share like a document",
    description: "Share with people or by link, star, move to a project, version history, trash and restore.",
  },
];

const STEPS: ModuleStep[] = [
  { number: "01", title: "Start", description: "A blank deck, a template, or a deck an agent wrote for you in chat." },
  { number: "02", title: "Shape it", description: "Edit text in place, reorder slides by dragging, pick a theme, add speaker notes." },
  { number: "03", title: "Present", description: "Full screen with arrow keys — or download PowerPoint or PDF and share." },
];

const SUB_AREAS: ModuleSubArea[] = [
  {
    title: "My presentations",
    status: "Live",
    href: "/presentations",
    items: ["Create + open", "Templates", "Recent, starred, trash", "Share and permissions"],
  },
  {
    title: "Editor",
    status: "Live",
    items: ["Edit in place", "Drag to reorder", "Themes", "Speaker notes"],
  },
];

export default function PresentationsLanding() {
  return (
    <ModuleLanding
      surfaceId="landing:presentations"
      eyebrow="AI Matrx Presentations"
      eyebrowIcon={LayoutTemplate}
      headline="Presentations that"
      headlineGradient="start from what your agents already know."
      description="Make, edit and present slide decks beside your chats, documents and workbooks. Agents write the first draft; you shape it and present."
      primaryCtaHref="/sign-up?source=presentations-landing"
      primaryCtaLabel="Start a Presentation Free"
      workspaceHref="/presentations"
      workspaceLabel="Presentations"
      capabilitiesHeading="A deck editor where the slides already look good"
      capabilitiesDescription="Edit in place, themes, agent decks, downloads and sharing."
      capabilities={CAPABILITIES}
      stepsDescription="From a blank deck or an agent's draft to a finished presentation in three steps."
      steps={STEPS}
      subAreasHeading="Presentation surfaces"
      subAreasDescription="Everything a deck needs, in one place."
      subAreas={SUB_AREAS}
      finalCtaHeading="Decks without the busywork"
      finalCtaDescription="Free to start, no credit card."
      relatedModules={["/documents", "/workbooks", "/notes"]}
    />
  );
}
