import { SurfacesAdminPage } from "@/features/tool-registry/surfaces/components/SurfacesAdminPage";

export const metadata = {
  title: "UI Surfaces | Tool Registry | Administration",
  description:
    "Rich admin for ui_surface — grouped by client and tier, with usage stats, bulk activate/deactivate, inline description edit, FK-aware delete, rename via FK CASCADE, and a curated candidate inventory for one-click bulk-add.",
};

export default function Page() {
  return <SurfacesAdminPage />;
}
