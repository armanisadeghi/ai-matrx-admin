import { BundlesAdminPage } from "@/features/tool-registry/bundles/components/BundlesAdminPage";

export const metadata = {
  title: "Bundles | Tool Registry | Admin",
  description:
    "Admin view of tool bundles (tl_bundle): system + personal, with member management and metadata.",
};

export default function Page() {
  return <BundlesAdminPage />;
}
