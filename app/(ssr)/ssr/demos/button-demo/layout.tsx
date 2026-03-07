import ButtonRow from "@/app/(ssr)/_components/core/ButtonRow";
import AddFilterSearchRow from "@/app/(ssr)/_components/core/AddFilterSearchRow";

export const metadata = {
  title: "Dashboard | AI Matrx",
  description: "Your central hub for all activities and insights",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* <PageHeader>
        <span className="shell-glass h-[1.875rem] px-3 rounded-full text-[0.6875rem] font-medium text-(--shell-nav-text-hover) flex items-center">
          Dashboard
        </span>
      </PageHeader> */}

      <div className="flex justify-center">
        <AddFilterSearchRow />
      </div>

      <div className="mt-16 px-2">
        <ButtonRow />
      </div>
      <div className="flex flex-col pt-16">{children}</div>
    </>
  );
}
