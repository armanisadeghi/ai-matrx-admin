// features/applets-host/builder/layout-source.ts — A LAYOUT APPLET AS THE BUILDER READS IT.
//
// The builder (`applets.build`) reads and answers code. A layout Applet (no files, `layout_config` set,
// CONTRACTS 2.12) is shown to it as the ONE entry file its own reference teaches for a simple job —
// `<FormLayout job="main" options={…} />` — with the stored options written out as a plain object, so
// "Change with AI" starts from what the Applet really is. `./layout-code.ts` reads an answer of that
// same shape back into `layout_config`, so a change of title, fields or wording keeps it a layout; only
// an answer that needs real code turns it into a code Applet. Plain strings only: no parser here (this
// module is in the builder's first chunk; the parser is not).
import type { AppletLayout, AppletLayoutKind } from "@ai-matrx/applets";

/** Each stock layout's component in `@ai-matrx/applets/react`. */
export const LAYOUT_COMPONENTS: Readonly<Record<AppletLayoutKind, string>> = {
  form: "FormLayout",
  form_to_chat: "FormToChatLayout",
  chat: "ChatLayout",
  centered_input: "CenteredInputLayout",
  chat_with_history: "ChatWithHistoryLayout",
  widget: "WidgetLayout",
};

/** The entry file a layout Applet is shown to the builder as. */
export const LAYOUT_ENTRY = "App.tsx";

/** The layout as one entry file: the stock component over its job, its options as a plain object. */
export function layoutSource(layout: AppletLayout): string {
  const component = LAYOUT_COMPONENTS[layout.kind];
  const options = layout.options && Object.keys(layout.options).length ? JSON.stringify(layout.options, null, 2) : null;
  return [
    `import { ${component} } from "@ai-matrx/applets/react";`,
    "",
    ...(options ? [`const OPTIONS = ${options};`, ""] : []),
    "export default function App() {",
    `  return <${component} job=${JSON.stringify(layout.job)}${options ? " options={OPTIONS}" : ""} />;`,
    "}",
    "",
  ].join("\n");
}
