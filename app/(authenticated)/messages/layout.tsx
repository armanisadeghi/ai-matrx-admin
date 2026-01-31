import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages | AI Matrx",
  description: "Direct messaging with other users",
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
