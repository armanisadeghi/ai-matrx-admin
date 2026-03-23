import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText, Search, Link2, BarChart3, Globe, Zap, Brain,
  PenTool, TrendingUp, ShieldCheck, Eye, Code2, Layers,
  Clock, Star, ArrowRight, Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SEO Tools — AI Matrx",
  description:
    "A complete suite of AI-powered and scraping-based SEO tools. Analyze meta tags, audit content, research keywords, check backlinks, and more.",
};

type ToolStatus = "live" | "coming-soon";

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  href: string;
  status: ToolStatus;
}

interface Accent {
  dot: string;       // hex
  light: string;     // light bg hex
  text: string;      // text hex
  border: string;    // border hex
}

interface Category {
  id: string;
  title: string;
  subtitle: string;
  accent: Accent;
  tools: Tool[];
}

// ── All colours are plain CSS values — no Tailwind interpolation ──────────────
const ACCENTS: Record<string, Accent> = {
  blue:    { dot: "#3b82f6", light: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  violet:  { dot: "#7c3aed", light: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  emerald: { dot: "#059669", light: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  orange:  { dot: "#ea580c", light: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
};

const categories: Category[] = [
  {
    id: "on-page",
    title: "On-Page Analysis",
    subtitle: "Inspect and score every element Google reads on your pages",
    accent: ACCENTS.blue,
    tools: [
      { id: "metadata", title: "Meta Width Calculator", description: "Calculate pixel widths and character counts for titles and descriptions with a live Google SERP preview.", icon: FileText, href: "/seo/metadata", status: "live" },
      { id: "page-audit", title: "Page SEO Audit", description: "Scrape any URL and get an instant on-page audit — title, description, headings, canonical, robots directives, and more.", icon: ShieldCheck, href: "/seo/page-audit", status: "coming-soon" },
      { id: "heading-structure", title: "Heading Structure Analyzer", description: "Visualize the H1–H6 hierarchy of any page and flag structural issues that hurt crawlability.", icon: Layers, href: "/seo/heading-structure", status: "coming-soon" },
      { id: "structured-data", title: "Structured Data Validator", description: "Parse JSON-LD and microdata on any page and validate against Google's rich result requirements.", icon: Code2, href: "/seo/structured-data", status: "coming-soon" },
    ],
  },
  {
    id: "content",
    title: "AI Content Intelligence",
    subtitle: "Let an LLM analyze, score, and improve your content",
    accent: ACCENTS.violet,
    tools: [
      { id: "content-score", title: "Content Quality Scorer", description: "AI reads your page and scores readability, depth, E-E-A-T signals, and topical coverage against the top 10 SERP results.", icon: Brain, href: "/seo/content-score", status: "coming-soon" },
      { id: "content-brief", title: "Content Brief Generator", description: "Provide a keyword, and the AI builds a complete content brief — target audience, outline, FAQs, and internal link suggestions.", icon: PenTool, href: "/seo/content-brief", status: "coming-soon" },
      { id: "meta-writer", title: "AI Meta Tag Writer", description: "Paste your page content or URL, and the AI drafts optimized title and description variants ranked by predicted CTR.", icon: Sparkles, href: "/seo/meta-writer", status: "coming-soon" },
      { id: "readability", title: "Readability Analyzer", description: "Score content across Flesch-Kincaid, Gunning Fog, and SMOG indexes, with sentence-level suggestions from an LLM.", icon: Eye, href: "/seo/readability", status: "coming-soon" },
    ],
  },
  {
    id: "keywords",
    title: "Keyword Research",
    subtitle: "Find, cluster, and prioritize the terms that drive traffic",
    accent: ACCENTS.emerald,
    tools: [
      { id: "keyword-clustering", title: "AI Keyword Clusterer", description: "Paste a list of keywords and the AI groups them by semantic intent, making it easy to plan pages and content hubs.", icon: Layers, href: "/seo/keyword-clustering", status: "coming-soon" },
      { id: "serp-analysis", title: "SERP Intent Analyzer", description: "Scrape the top 10 results for any keyword and use an LLM to identify the dominant search intent and content format.", icon: Search, href: "/seo/serp-analysis", status: "coming-soon" },
      { id: "lsi-keywords", title: "LSI & Entity Finder", description: "AI extracts the semantic entities and latent terms from top-ranking pages so your content covers the full topic graph.", icon: TrendingUp, href: "/seo/lsi-keywords", status: "coming-soon" },
      { id: "title-optimizer", title: "Title Tag Optimizer", description: "A/B-test headline variants with predicted CTR scoring. LLM rewrites your titles for clarity, keyword placement, and length.", icon: BarChart3, href: "/seo/title-optimizer", status: "coming-soon" },
    ],
  },
  {
    id: "technical",
    title: "Technical SEO",
    subtitle: "Diagnose infrastructure issues that block rankings",
    accent: ACCENTS.orange,
    tools: [
      { id: "redirect-tracer", title: "Redirect Chain Tracer", description: "Follow every redirect hop from a URL and surface chain loops, unnecessary hops, and mixed-protocol issues.", icon: Link2, href: "/seo/redirect-tracer", status: "coming-soon" },
      { id: "robots-tester", title: "Robots.txt Tester", description: "Fetch and parse any site's robots.txt, then test whether specific URLs are allowed or blocked by each rule.", icon: ShieldCheck, href: "/seo/robots-tester", status: "coming-soon" },
      { id: "page-speed", title: "Core Web Vitals Analyzer", description: "Measure LCP, CLS, and INP with an AI summary of the biggest opportunities to improve your CWV scores.", icon: Zap, href: "/seo/page-speed", status: "coming-soon" },
      { id: "hreflang", title: "Hreflang Validator", description: "Scrape a URL and validate all hreflang tags — check for missing reciprocals, incorrect locale codes, and self-referencing issues.", icon: Globe, href: "/seo/hreflang", status: "coming-soon" },
    ],
  },
];

// ── Tool card ─────────────────────────────────────────────────────────────────

function ToolCard({ tool, accent }: { tool: Tool; accent: Accent }) {
  const Icon = tool.icon;
  const isLive = tool.status === "live";

  const inner = (
    <div className={
      isLive
        ? "group relative flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md cursor-pointer"
        : "group relative flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-5 cursor-not-allowed opacity-60"
    }>
      {/* Icon + badge */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
          style={{ backgroundColor: accent.light, border: `1px solid ${accent.border}`, color: accent.dot }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isLive ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white"
              style={{ backgroundColor: accent.dot }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/70" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              <Clock className="w-2.5 h-2.5" />
              Coming soon
            </span>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="space-y-1.5 flex-1">
        <h3 className={isLive
          ? "text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          : "text-sm font-semibold leading-snug text-zinc-400 dark:text-zinc-500"
        }>
          {tool.title}
        </h3>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {tool.description}
        </p>
      </div>

      {isLive && (
        <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mt-auto pt-1">
          Open tool
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );

  return isLive ? (
    <Link href={tool.href} className="block">{inner}</Link>
  ) : (
    <div title="Coming soon">{inner}</div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SeoLandingPage() {
  const totalTools = categories.reduce((sum, c) => sum + c.tools.length, 0);
  const liveTools  = categories.reduce((sum, c) => sum + c.tools.filter(t => t.status === "live").length, 0);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-zinc-900">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-3xl" />

        <div className="relative max-w-[1200px] mx-auto px-6 py-14 xl:py-20">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              <Sparkles className="w-3 h-3" />
              AI-Powered SEO Suite
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 max-w-2xl leading-[1.1]">
            SEO Tools,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
              powered by AI
            </span>
          </h1>

          <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
            A complete toolkit for on-page analysis, content intelligence, keyword research,
            and technical audits. Combine scraping with large language models to get insights
            no standard tool can match.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            {[
              { icon: Star,   bg: "bg-blue-100 dark:bg-blue-900/40",    color: "text-blue-600 dark:text-blue-400",    value: totalTools, label: "Total tools" },
              { icon: Zap,    bg: "bg-emerald-100 dark:bg-emerald-900/40", color: "text-emerald-600 dark:text-emerald-400", value: liveTools, label: "Live now" },
              { icon: Brain,  bg: "bg-violet-100 dark:bg-violet-900/40",  color: "text-violet-600 dark:text-violet-400",  value: 4,         label: "Categories" },
            ].map(({ icon: I, bg, color, value, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <I className={`w-4 h-4 ${color}`} />
                </span>
                <div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none">{value}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="max-w-[1200px] mx-auto px-6 py-12 xl:px-8 space-y-14 pb-20">
        {categories.map((category) => {
          const liveCt = category.tools.filter(t => t.status === "live").length;
          return (
            <section key={category.id}>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: category.accent.dot }} />
                    <h2
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: category.accent.text }}
                    >
                      {category.title}
                    </h2>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{category.subtitle}</p>
                </div>
                <span
                  className="flex-shrink-0 text-[10px] font-medium rounded-full px-2.5 py-1 border"
                  style={{ backgroundColor: category.accent.light, borderColor: category.accent.border, color: category.accent.text }}
                >
                  {liveCt}/{category.tools.length} live
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {category.tools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} accent={category.accent} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Footer */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700">
            <Brain className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">More tools arriving regularly</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Every tool combines web scraping with LLM analysis — giving you the depth of a human SEO audit at machine speed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
