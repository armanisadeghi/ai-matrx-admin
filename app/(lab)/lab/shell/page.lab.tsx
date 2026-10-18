// The new app frame — playground (owner model, 2026-10-17). Static samples;
// components live in features/shell/frame/ and later move to @ai-matrx/shell.
import { ShellPlayground } from "./ShellPlayground";

export const metadata = { title: "App frame" };

export default function LabShellPage() {
  return <ShellPlayground />;
}
