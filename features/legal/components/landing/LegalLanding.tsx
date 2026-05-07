import Link from "next/link";
import {
  Scale,
  Search,
  FileStack,
  Bot,
  Calculator,
  Eye,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  {
    icon: Search,
    title: "Legal research that cites itself",
    description:
      "Multi-source search, scraped, summarized, tagged, and turned into a structured memo — every claim links back to its source.",
  },
  {
    icon: FileStack,
    title: "Your case files, instantly searchable",
    description:
      "Upload pleadings, depositions, medical records, contracts, exhibits. Ask questions in plain English; every answer cites the document, page, and paragraph it came from.",
  },
  {
    icon: Bot,
    title: "Drafting agents",
    description:
      "Brief skeletons, demand letters, rebuttal points, deposition outlines. Specialist agents per task, not one all-purpose chat.",
  },
  {
    icon: Calculator,
    title: "Practice-area calculators",
    description:
      "Deterministic math sits at the edges — PD ratings, weeks, present value, life expectancy. Numbers an adjuster will not argue with.",
  },
  {
    icon: Eye,
    title: "Replayable trajectories",
    description:
      "Every model call, tool invocation, and document read is traced. Replay any answer step by step from any checkpoint.",
  },
  {
    icon: ShieldCheck,
    title: "Determinism where it counts",
    description:
      "Tools execute deterministically. Permissions, schemas, and audit trails are not surfaces the model can argue past.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Bring the file in",
    description:
      "Upload pleadings, medical records, depositions, exhibits. Or paste a URL, a transcript, a base64 blob.",
  },
  {
    number: "02",
    title: "Indexed per matter",
    description:
      "Documents are organized into a private, per-matter knowledge base — searchable in seconds, with every answer pinned to its source.",
  },
  {
    number: "03",
    title: "Run the workflow",
    description:
      "Research, draft, calculate, summarize — pick the agent, set the inputs, get a deterministic answer.",
  },
  {
    number: "04",
    title: "Verify, then ship",
    description:
      "Replay the trajectory, override anything, regenerate. Nothing leaves the harness without a human pass.",
  },
];

const PRACTICE_AREAS: Array<{
  title: string;
  status: string;
  href?: string;
  items: string[];
}> = [
  {
    title: "California Workers’ Comp",
    status: "Live",
    href: "/legal/ca-wc",
    items: [
      "PD ratings calculator",
      "AOE/COE analysis",
      "QME review",
      "Deposition prep",
    ],
  },
  {
    title: "Personal Injury",
    status: "Coming soon",
    items: [
      "Settlement modeling",
      "Medical record summaries",
      "Demand letters",
      "Comparative liability",
    ],
  },
  {
    title: "Estate Planning",
    status: "Coming soon",
    items: [
      "Trust drafting",
      "Asset mapping",
      "Beneficiary analysis",
      "Jurisdictional checks",
    ],
  },
  {
    title: "Contracts & Diligence",
    status: "Coming soon",
    items: [
      "Clause extraction",
      "Redline assistance",
      "Deviation reports",
      "Obligations matrix",
    ],
  },
  {
    title: "Litigation Support",
    status: "Coming soon",
    items: [
      "Chronologies",
      "Witness summaries",
      "Exhibit prep",
      "Brief skeletons",
    ],
  },
  {
    title: "Custom Practice Area",
    status: "Bring your own",
    items: [
      "Your own playbooks",
      "Your own agents",
      "Your own document types",
      "Your own calculators",
    ],
  },
];

export default function LegalLanding() {
  return (
    <div className="min-h-dvh">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent"
        />
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Scale className="h-3.5 w-3.5" />
            AI Matrx for Legal
          </div>
          <h1 className="text-[clamp(2rem,1.5rem+2.5vw,3.75rem)] font-bold tracking-tight text-foreground leading-[1.1]">
            The agentic harness,{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              built for legal work.
            </span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-[clamp(1rem,0.95rem+0.25vw,1.25rem)] text-muted-foreground leading-relaxed">
            Research that shows its work. Case files you can search and cite
            in plain English. Drafting agents you can replay. Calculators that
            do not drift. The frontier labs build the engines — we build the
            vehicle that takes them into the firm.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto min-h-[44px] text-base px-8 gap-2"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-h-[44px] text-base px-8"
              asChild
            >
              <Link href="#capabilities">See what it does</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section
        id="capabilities"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24"
      >
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-[clamp(1.5rem,1.25rem+1.5vw,2.5rem)] font-bold tracking-tight">
            Boring infrastructure, sharper practice
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Memory that survives. Tools that execute deterministically. A
            trajectory you can hand to opposing counsel.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {CAPABILITIES.map((feature) => (
            <div
              key={feature.title}
              className={cn(
                "group relative rounded-2xl border border-border bg-card p-6",
                "transition-all duration-300",
                "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="bg-card/50 border-y border-border"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-[clamp(1.5rem,1.25rem+1.5vw,2.5rem)] font-bold tracking-tight">
              How it works
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              From a folder of records to a defensible answer in four steps.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice areas */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-[clamp(1.5rem,1.25rem+1.5vw,2.5rem)] font-bold tracking-tight">
            Practice areas
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Specialty surfaces shipping module by module. Bring your own when
            yours is not on the list.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PRACTICE_AREAS.map((area) => {
            const card = (
              <div
                className={cn(
                  "h-full rounded-2xl border border-border bg-card p-5",
                  "transition-all duration-300",
                  area.href &&
                    "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer",
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-base">{area.title}</h3>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                      area.status === "Live"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground border border-border",
                    )}
                  >
                    {area.status === "Live" ? (
                      <Sparkles className="h-3 w-3" />
                    ) : null}
                    {area.status}
                  </span>
                </div>
                <ul className="space-y-2">
                  {area.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                {area.href ? (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                ) : null}
              </div>
            );

            if (area.href) {
              return (
                <Link key={area.title} href={area.href} className="block">
                  {card}
                </Link>
              );
            }

            return <div key={area.title}>{card}</div>;
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-[clamp(1.5rem,1.25rem+1.5vw,2.5rem)] font-bold tracking-tight">
            Put AI Matrx to work in your practice
          </h2>
          <p className="mt-4 text-muted-foreground text-lg mb-8">
            Research, document review, drafting, and calculators — on a
            harness designed for the rigor your work demands.
          </p>
          <Button size="lg" className="min-h-[44px] text-base px-10 gap-2">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
