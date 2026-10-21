import { Globe, Landmark, Link2, Share2, Users } from "lucide-react";
import {
  ModuleLanding,
  type ModuleCapability,
  type ModuleStep,
} from "@/features/auth/components/module-landing/ModuleLanding";

const CAPABILITIES: ModuleCapability[] = [
  {
    icon: Link2,
    title: "Paste a link, get a brand",
    description: "Smart Add reads a website or social profile and fills in the rest.",
  },
  {
    icon: Globe,
    title: "Every website in one place",
    description: "Each brand keeps its sites, pages and crawls together.",
  },
  {
    icon: Share2,
    title: "Social profiles that stay tracked",
    description: "Connect handles once and see them on the brand.",
  },
  {
    icon: Users,
    title: "A company or a person",
    description: "Run an agency's clients or your own personal brand.",
  },
  {
    icon: Landmark,
    title: "One record agents can read",
    description: "Facts you confirm become ground truth for every agent.",
  },
];

const STEPS: ModuleStep[] = [
  { number: "01", title: "Add a brand", description: "Paste a website or a social link, or fill it in by hand." },
  { number: "02", title: "Confirm what we found", description: "Keep the facts that are right and fix the rest." },
  { number: "03", title: "Work from it", description: "Websites, socials, SEO and content all hang off the brand." },
];

export default function BrandsLanding() {
  return (
    <ModuleLanding
      surfaceId="landing:brands"
      eyebrow="AI Matrx Brands"
      eyebrowIcon={Landmark}
      headline="Every brand you run,"
      headlineGradient="in one place."
      description="Add a brand from a link, confirm what we find, and open its whole workspace: websites, socials, assets and facts."
      primaryCtaHref="/sign-up?source=brands-landing"
      primaryCtaLabel="Start Free"
      workspaceHref="/marketing/brands/all"
      workspaceLabel="Brands"
      capabilitiesHeading="Built brand-first"
      capabilitiesDescription="The brand is the record everything else reads from."
      capabilities={CAPABILITIES}
      stepsDescription="From a link to a working brand in three steps."
      steps={STEPS}
      finalCtaHeading="Start with one link"
      finalCtaDescription="Free to start, no credit card."
      relatedModules={["/marketing", "/agents", "/knowledge"]}
    />
  );
}
