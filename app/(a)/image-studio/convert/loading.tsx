import { Skeleton } from "@/components/ui/skeleton";

export default function ConvertLoading() {
    return (
        <div className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden bg-background">
            <div className="flex items-center justify-between gap-3 h-12 px-4 border-b border-border bg-card/40 shrink-0">
                <Skeleton className="h-6 w-48" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-7 w-20" />
                </div>
            </div>
            <div className="flex-1 min-h-0 flex">
                <div className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 border-r border-border bg-card/30 min-h-0 p-3 gap-2">
                    <Skeleton className="h-8 w-full" />
                    <div className="space-y-1 pt-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full rounded-md" />
                        ))}
                    </div>
                </div>
                <div className="flex-1 p-4 md:p-5">
                    <Skeleton className="h-[260px] w-full rounded-2xl" />
                </div>
                <div className="hidden lg:flex flex-col w-80 xl:w-96 min-h-0 border-l border-border p-3 gap-3">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                </div>
            </div>
        </div>
    );
}
