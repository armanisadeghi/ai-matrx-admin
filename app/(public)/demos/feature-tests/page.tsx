import { readdir } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { ChevronRight, FlaskConical } from "lucide-react";

function formatSegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getTestPages(dir: string): Promise<string[]> {
  const pages: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const subDir = join(dir, entry.name);
      try {
        const subEntries = await readdir(subDir);
        if (subEntries.includes("page.tsx") || subEntries.includes("page.ts")) {
          pages.push(entry.name);
        }
      } catch {
        // skip unreadable subdirs
      }
    }
  } catch (error) {
    console.error(`Error reading feature-tests directory:`, error);
  }
  return pages.sort();
}

export default async function FeatureTestsPage() {
  const testsDir = join(
    process.cwd(),
    "app",
    "(public)",
    "demos",
    "feature-tests",
  );
  const pages = await getTestPages(testsDir);

  return (
    <div className="h-full overflow-y-auto bg-textured">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Feature Tests</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Internal integration tests for individual features and components.{" "}
            {pages.length} test{pages.length !== 1 ? "s" : ""} available.
          </p>
        </div>

        {pages.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-8 text-center">
            <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No test pages found yet.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {pages.map((slug) => (
            <Link key={slug} href={`/demos/feature-tests/${slug}`}>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {formatSegment(slug)}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
