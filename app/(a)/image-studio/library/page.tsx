import Link from "next/link";
import { Suspense } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Layers,
    Library,
    Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserStudioLibrary } from "@/features/image-studio/server/library";
import {
    LibraryGrid,
    LibrarySummaryBar,
} from "@/features/image-studio/components/LibraryGrid";

/**
 * /image-studio/library
 *
 * Server Component. Static shell renders instantly with fixed-dimension
 * placeholders; the user's actual library streams in through a nested
 * Suspense boundary (uses server-only data fetch + react cache()).
 */
export default function LibraryPage() {
    return (
        <main className="min-h-[calc(100dvh-2.5rem)] overflow-y-auto bg-background">
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
                            <h1 className="text-sm font-semibold flex items-center gap-1.5 truncate">
                                <Library className="h-3.5 w-3.5 text-primary" />
                                My Image Library
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Link
                            href="/image-studio/presets"
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            Presets
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

            <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 max-w-[1400px] space-y-6">
                <div className="max-w-3xl space-y-2">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        Saved exports
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Every Image Studio export you&rsquo;ve saved to your library,
                        grouped by session. Each tile is a public URL — click to open
                        the raw file in a new tab. Copy the URL from the image
                        properties to paste into your app.
                    </p>
                </div>
                <Suspense fallback={<LibrarySkeleton />}>
                    <LibraryBody />
                </Suspense>
            </div>
        </main>
    );
}

async function LibraryBody() {
    const snapshot = await getUserStudioLibrary();
    return (
        <div className="space-y-6">
            <LibrarySummaryBar
                sessionCount={snapshot.sessions.length}
                totalVariants={snapshot.totalVariants}
                totalBytes={snapshot.totalBytes}
            />
            <LibraryGrid sessions={snapshot.sessions} />
        </div>
    );
}

function LibrarySkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-11 w-80 rounded-xl" />
            {Array.from({ length: 2 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-2xl border border-border overflow-hidden"
                >
                    <div className="h-12 border-b border-border bg-muted/30 p-2.5">
                        <Skeleton className="h-full w-64" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
                        {Array.from({ length: 8 }).map((_, j) => (
                            <Skeleton key={j} className="h-32 rounded-lg" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
