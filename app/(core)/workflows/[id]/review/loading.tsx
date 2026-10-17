// Shown the instant /workflows/[id]/review (and an issue under it) is opened, while the route
// itself is still answering — a cold route takes seconds, and the header Flag button looked dead.
export default function WorkflowReviewLoading() {
  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2 p-3" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted/50" />
      <div className="h-7 w-full animate-pulse rounded-md bg-muted/40" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
      ))}
    </div>
  );
}
