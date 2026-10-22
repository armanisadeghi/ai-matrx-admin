"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { parseImageHubDestination } from "@/features/image-manager/hub-surface";
import {
  buildManagerLandingScope,
  managerLandingSections,
} from "@/features/image-manager/managerLandingSurface";

const SURFACE_NAME = "matrx-user/image-manager";

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
    description: "Your image library, in sync everywhere.",
    Icon: Cloud,
    accent: "text-violet-500",
  },
  {
    href: "/images/all-files",
    label: "All Files",
    description: "Full cloud-files browser, folders and all.",
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
    description: "Cover, OG, thumb, favicon variants in one go.",
    Icon: Stamp,
    accent: "text-orange-500",
  },
  {
    href: "/images/tools",
    label: "Tools",
    description: "Crop, lightbox, gallery, screenshot, and more.",
    Icon: Wrench,
    accent: "text-zinc-500",
  },
];

const LINKS = TILES.map(({ href, label, description }) => ({ href, label, description }));

/**
 * The Manager landing: the header already names the page ("Images / Manager"),
 * so the body is the tool tiles and nothing else — no hero, no second title.
 * Agents see the displayed tiles (`image_hub_*`) and can open one through
 * `open_image_workspace`, the same door a click uses.
 */
export function ManagerLandingHero() {
  const router = useRouter();
  const sections = managerLandingSections(LINKS);
  const getScope = () => buildManagerLandingScope(LINKS);

  return (
    <SurfaceRuntimeProvider
      surfaceName={SURFACE_NAME}
      getScope={getScope}
      getWriteHandlers={() => ({
        open_image_workspace: {
          validate: (value) => {
            parseImageHubDestination(value, sections);
          },
          apply: (value) => {
            const href = parseImageHubDestination(value, sections);
            router.push(href);
            return { summary: `Opened ${href}.`, data: { href } };
          },
        },
      })}
    >
      <NonEditableContextMenu
        sourceFeature="image-studio"
        surfaceName={SURFACE_NAME}
        menuVersion={2}
        getApplicationScope={getScope}
        contentSource={{ type: "raw" }}
        extraSections={[
          {
            id: "image-manager-tools",
            label: "Manager tools",
            anchor: "after-clipboard",
            items: LINKS.map((link) => ({
              kind: "item" as const,
              id: link.href,
              label: `Open ${link.label}`,
              icon: ArrowRight,
              onSelect: () => router.push(link.href),
            })),
          },
        ]}
      >
        <div
          data-surface-value="image_hub_links"
          className="matrx-touch-targets h-full overflow-y-auto overscroll-contain"
        >
          <div className="px-3 pb-3 pt-3 md:hidden">
            <div className="overflow-hidden rounded-lg border border-border bg-card/70">
              {TILES.map(({ href, label, description, Icon, accent }, index) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-h-[58px] items-center gap-3 px-3 py-2 active:bg-muted/70 ${
                    index > 0 ? "border-t border-border/70" : ""
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                    <Icon className={`h-4 w-4 ${accent}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold tracking-tight">
                        {label}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <section className="container mx-auto hidden max-w-[1400px] px-6 py-6 md:block md:px-10">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {TILES.map(({ href, label, description, Icon, accent }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                    <Icon className={`h-4 w-4 ${accent}`} />
                  </div>
                  <div className="w-full min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-sm font-semibold tracking-tight">
                        {label}
                      </h2>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </NonEditableContextMenu>
    </SurfaceRuntimeProvider>
  );
}
