import { join } from "path";
import { EntityPack } from "@/providers/packs/EntityPack";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";

export const dynamic = "force-dynamic";

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
