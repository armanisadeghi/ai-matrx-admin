import { readdir } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { formatTitleCase } from "@/utils/text/text-case-converter";

async function getDemoRoutes(dir: string, baseRoute: string = ""): Promise<string[]> {
  const routes: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const routePath = baseRoute ? `${baseRoute}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        // Check if this directory has a page.tsx
        const hasPage = entries.some(
          (e) => e.name === "page.tsx" && e.isFile()
        );
        
        // If current directory has page.tsx and we're in a subdirectory, add it
        if (hasPage && baseRoute) {
          // Skip - we'll get it from the parent call
        }
        
        // Recursively check subdirectories
        const subRoutes = await getDemoRoutes(fullPath, routePath);
        routes.push(...subRoutes);
      } else if (entry.name === "page.tsx" && baseRoute) {
        // Found a page.tsx in a subdirectory
        routes.push(baseRoute);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return routes;
}

function formatRouteName(route: string): string {
  // Convert "api-tests" or "api-tests/pdf-extract" to readable format
  const segments = route.split("/");
  return segments
    .map((segment) => formatTitleCase(segment))
    .join(" → ");
}

export default async function DemosPage() {
  const demosDir = join(process.cwd(), "app", "(public)", "demos");
  const routes = await getDemoRoutes(demosDir);
  
  // Sort routes alphabetically
  routes.sort();

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-y-auto">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Demos</h1>
          <p className="text-muted-foreground">
            Available demo pages ({routes.length} total)
          </p>
        </div>

        <div className="grid gap-3">
          {routes.map((route) => (
            <Link key={route} href={`/demos/${route}`}>
              <Card className="p-4 hover:bg-accent transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">
                      {formatRouteName(route)}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      /demos/{route}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          ))}

          {routes.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No demo pages found</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

