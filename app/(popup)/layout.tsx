import "@/app/globals.css";

export default function PopupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">{children}</div>
  );
}
