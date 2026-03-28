import ButtonRow from "@/features/cx-chat/components/button-demo/ButtonRow";

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
      <div className="flex flex-col pt-10">{children}</div>
    </>
  );
}
