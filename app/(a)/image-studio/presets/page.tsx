import Link from "next/link";
import { ArrowLeft, ArrowRight, Library, Sparkles } from "lucide-react";
import { PresetCatalogReadOnly } from "@/features/image-studio/components/PresetCatalog";
import { ALL_PRESETS, PRESET_CATEGORIES } from "@/features/image-studio/presets";

/**
 * /image-studio/presets
 *
 * Browsable static catalog. Pure Server Component — the preset data is a
 * static TypeScript object, so everything here prerenders. No JS ships from
 * this page apart from the Next.js link runtime.
 */
export default function PresetsPage() {
    const totalPresets = ALL_PRESETS.length;
    const totalCategories = PRESET_CATEGORIES.length;

    return (
        <main className="min-h-[calc(100dvh-2.5rem)] overflow-y-auto bg-background">
            {/* Static header */}
            <header className="border-b border-border bg-card/40 sticky top-0 z-10 backdrop-blur">
                <div className="container mx-auto px-4 sm:px-6 md:px-10 py-3 max-w-[1400px] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href="/image-studio"
                            className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            title="Back to Image Studio"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold truncate">
                                Preset Catalog
                            </h1>
                            <p className="text-[11px] text-muted-foreground">
                                {totalPresets} presets across {totalCategories} categories
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Link
                            href="/image-studio/library"
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Library className="h-3.5 w-3.5" />
                            Library
                        </Link>
                        <Link
                            href="/image-studio/convert"
                            className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Convert
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Catalog body */}
            <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 max-w-[1400px]">
                <div className="max-w-3xl mb-8">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        Every size, explained
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        This is the full reference for what Image Studio can produce. Each
                        preset has a clear intent and the platform spec it matches. Click{" "}
                        <Link
                            href="/image-studio/convert"
                            className="underline text-primary"
                        >
                            Convert
                        </Link>{" "}
                        to drop an image in and pick any subset of these in one go.
                    </p>
                </div>
                <PresetCatalogReadOnly />
            </div>
        </main>
    );
}
