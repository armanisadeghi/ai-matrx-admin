// The run page manages its own sidebar via AgentRunnerPage's internal layout.
// Emit the shell-hide-sidebar sentinel so the CSS collapses the shell sidebar
// column to zero — prevents dead blank space on the left.
export default function RunLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="shell-hide-sidebar" aria-hidden="true" />
      {children}
    </>
  );
}
