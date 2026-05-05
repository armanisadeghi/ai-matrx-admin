import { SurfacesAdminPage } from "@/features/tool-registry/surfaces/components/SurfacesAdminPage";

export const metadata = {
  title: "UI Surfaces | Tool Registry | Admin",
  description:
    "Rich admin for ui_surface — grouped by client and tier, with usage stats, bulk activate/deactivate, inline description edit, and FK-aware delete.",
};

export default function Page() {
  return <SurfacesAdminPage />;
}
