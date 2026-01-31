/**
 * Messages Layout
 * 
 * Simple passthrough layout for the messages routes.
 * The main authenticated layout already includes MessagingInitializer.
 */

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
