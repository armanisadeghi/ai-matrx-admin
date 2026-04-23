import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dimension-matched landing skeleton. Mirrors the hero + stat row + feature
 * grid of `StudioLandingHero` so there's zero layout shift on first paint.
 */
export default function ImageStudioLoading() {
    return (
        <div className="min-h-[calc(100dvh-2.5rem)] bg-background">
            <section className="border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 md:px-10 py-12 md:py-16 max-w-[1400px] space-y-5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-3/4 max-w-2xl" />
                    <Skeleton className="h-10 w-2/3 max-w-xl" />
                    <Skeleton className="h-5 w-full max-w-xl" />
                    <div className="flex gap-3 pt-2">
                        <Skeleton className="h-11 w-44 rounded-xl" />
                        <Skeleton className="h-11 w-52 rounded-xl" />
                        <Skeleton className="h-11 w-36 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl pt-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-xl" />
                        ))}
                    </div>
                </div>
            </section>
            <section className="container mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-14 max-w-[1400px]">
                <Skeleton className="h-7 w-48 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-36 rounded-2xl" />
                    ))}
                </div>
            </section>
        </div>
    );
}
