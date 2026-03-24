import { ModuleHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { scanRoutes, toModulePages } from "@/utils/route-discovery";

interface RouteHeaderDataProps {
  directory: string;
  moduleHome: string;
  moduleName: string;
  children: React.ReactNode;
}

export async function RouteHeaderData({
  directory,
  moduleHome,
  moduleName,
  children,
}: RouteHeaderDataProps) {
  const routes = await scanRoutes(directory);
  routes.sort();
  const pages = toModulePages(routes, moduleHome);

  return (
    <div className="flex flex-col h-page">
      <ModuleHeader
        pages={pages}
        currentPath=""
        moduleHome={moduleHome}
        moduleName={moduleName}
      />
      <main className="w-full h-full bg-textured">{children}</main>
    </div>
  );
}
