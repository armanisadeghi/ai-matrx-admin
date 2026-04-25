import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const dynamic = "force-dynamic";

export const metadata = createRouteMetadata("/legacy/demo", {
  title: "Demo",
  description:
    "Hub for interactive demos — voice, code generation, UI experiments, and tools",
  letter: "Dm",
});

// EntityPack was previously wrapped here. The `(legacy)/layout.tsx` group
// layout now mounts `EntityProviders` (which includes `EntityPack`) for the
// whole branch, so each entity route's own layout just provides route-scoped
// metadata + module header.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(process.cwd(), "app", "(legacy)", "legacy", "demo")}
      moduleHome="/legacy/demo"
      moduleName="Demo"
    >
      {children}
    </RouteHeaderData>
  );
}
