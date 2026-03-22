import ButtonRow from "@/app/(ssr)/_components/core/ButtonRow";
import AddFilterSearchRow from "@/app/(ssr)/_components/core/AddFilterSearchRow";
import AllButtonsShowcase from "@/app/(ssr)/_components/core/AllButtonsShowcase";

export const metadata = {
  title: "Button Demo | AI Matrx",
  description: "TapTargetButton showcase — all icons and variants",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex justify-center">
        <AddFilterSearchRow />
      </div>

      <div className="mt-16">
        <ButtonRow />
      </div>

      <div className="mt-12">
        <AllButtonsShowcase />
      </div>

      <div className="flex flex-col pt-16">{children}</div>
    </>
  );
}
