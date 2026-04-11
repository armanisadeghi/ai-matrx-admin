import { join } from "path";
import { EntityPack } from "@/providers/packs/EntityPack";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const dynamic = "force-dynamic";

export const metadata = createRouteMetadata("/demo", {
  title: "Demo",
  description:
    "Hub for interactive demos — voice, code generation, UI experiments, and tools",
  letter: "Dm",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <EntityPack>
      <RouteHeaderData
        directory={join(process.cwd(), "app", "(authenticated)", "demo")}
        moduleHome="/demo"
        moduleName="Demo"
      >
        {children}
      </RouteHeaderData>
    </EntityPack>
  );
}
