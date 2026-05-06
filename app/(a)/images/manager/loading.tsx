import { Skeleton } from "@/components/ui/skeleton";

export default function ImagesManagerLoading() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex overflow-hidden bg-textured">
      <aside className="w-44 flex-shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="px-3 py-2.5 border-b border-border">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="py-1 space-y-0.5 px-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3 flex-1 max-w-[80px]" />
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-card/40 px-5 py-2.5 flex items-center gap-2 flex-shrink-0">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-28" />
        </header>

        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <div className="border-b border-border pb-3 flex items-center gap-2">
            <Skeleton className="h-9 flex-1 max-w-md" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
