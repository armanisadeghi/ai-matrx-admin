import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
    return (
        <div className="min-h-[calc(100dvh-2.5rem)] bg-background">
            <div className="border-b border-border bg-card/40 h-12">
                <div className="container mx-auto px-4 sm:px-6 md:px-10 h-full max-w-[1400px] flex items-center">
                    <Skeleton className="h-6 w-48" />
                </div>
            </div>
            <div className="container mx-auto px-4 sm:px-6 md:px-10 py-8 max-w-[1400px] space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-full max-w-2xl" />
                </div>
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
        </div>
    );
}
