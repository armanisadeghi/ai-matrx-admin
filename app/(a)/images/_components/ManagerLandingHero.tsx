import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  FolderTree,
  ImageIcon,
  Stamp,
  Upload,
  Wrench,
  type LucideIcon,
} from "lucide-react";

interface Tile {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  accent: string;
}

const TILES: Tile[] = [
  {
    href: "/images/public-search",
    label: "Public Search",
    description: "Curated covers and Unsplash search.",
    Icon: ImageIcon,
    accent: "text-sky-500",
  },
  {
    href: "/images/my-cloud",
    label: "My Cloud",
    description: "Image-filtered view of your cloud library.",
    Icon: Cloud,
    accent: "text-violet-500",
  },
  {
    href: "/images/all-files",
    label: "All Files",
    description: "Full cloud-files browser, folders + non-image files.",
    Icon: FolderTree,
    accent: "text-amber-500",
  },
  {
    href: "/images/upload",
    label: "Upload",
    description: "Drag, drop, paste — saves to your cloud.",
    Icon: Upload,
    accent: "text-emerald-500",
  },
  {
    href: "/images/branded",
    label: "Branded",
    description: "Generate cover / OG / thumb / favicon variants from one image.",
    Icon: Stamp,
    accent: "text-orange-500",
  },
  {
    href: "/images/tools",
    label: "Tools",
    description: "Crop, lightbox, floating gallery, screenshot, and more.",
    Icon: Wrench,
    accent: "text-zinc-500",
  },
];

export function ManagerLandingHero() {
  return (
    <div className="h-full overflow-y-auto">
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
        />
        <div className="relative container mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-12 max-w-[1400px]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-3">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Images / Manager</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight max-w-3xl">
            Browse, upload, and create.
          </h1>
          <p className="text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            Every upload lands in your cloud and stays in sync across every
            Matrx surface. Pick a workflow below or browse with the sidebar.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-[1400px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TILES.map(({ href, label, description, Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors flex flex-col gap-2"
            >
              <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center">
                <Icon className={`h-5 w-5 ${accent}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm tracking-tight">{label}</h3>
                <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
