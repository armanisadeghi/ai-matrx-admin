import Link from "next/link";
import { Button } from "@ai-matrx/design-system/controls";

export default function SharedComparisonNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-[var(--matrx-page-gutter,1rem)] py-24">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">That comparison is not shared</h1>
      <Button variant="primary" asChild>
        <Link href="/compare">Start a comparison</Link>
      </Button>
    </div>
  );
}
