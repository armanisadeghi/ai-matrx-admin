/**
 * THE DETAIL HOST'S CUSTOM-FIELDS SECTION LOADS WHEN A RECORD OPENS, NOT WHEN THE APP BOOTS.
 *
 * `DetailHost` is mounted on every route by app/Providers.tsx. Its `customFields.Section` port
 * used to be bound statically to `DetailCustomFieldsSection` → `EntityCustomFields` →
 * `@ai-matrx/records-ui` (~4.4 MB of every route's first load, 2026-10-13). The port is now a
 * lazy component over ONE `import()`, with a form-shaped skeleton while it arrives.
 *
 * Drives the REAL host binding and renders the port exactly as the Detail body's
 * `CustomFieldsPort` does (`useDetailHost().customFields.Section` with `{ token, id }`).
 *
 * RED without the fix: with `DetailHost.tsx` importing `./DetailCustomFieldsSection` statically,
 * the section's implementation is evaluated the moment the host module is imported, and the first
 * render shows the section, never the skeleton.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createCanvasStore } from "@ai-matrx/canvas";
import { CanvasProvider } from "@ai-matrx/canvas/react";
import { useDetailHost } from "@ai-matrx/detail/react";
import overlays from "@/lib/redux/slices/overlaySlice";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockEvaluated: string[] = [];

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock("@/lib/toast", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warning: jest.fn() },
  recordToast: { info: jest.fn() },
}));
// The section's heavy body (records-ui). Recording WHEN it is evaluated is the proof.
jest.mock("@/features/unified-data/components/EntityCustomFields", () => {
  mockEvaluated.push("EntityCustomFields");
  return {
    EntityCustomFields: ({ entityToken, recordId }: { entityToken: string; recordId: string }) => (
      <div data-testid="custom-fields">{`custom fields for ${entityToken}/${recordId}`}</div>
    ),
  };
});

import { DetailHost } from "@/features/window-panels/detail/DetailHost";

function SectionPort({ token, id }: { token: string; id: string }) {
  const Section = useDetailHost().customFields?.Section;
  return Section ? <Section token={token} id={id} /> : <div data-testid="no-port" />;
}

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

it("importing the host does not load the section; opening a record does, behind a skeleton", async () => {
  expect(mockEvaluated).toEqual([]);

  act(() => {
    root.render(
      <Provider store={configureStore({ reducer: { overlays } })}>
        <CanvasProvider store={createCanvasStore()} persistence={null}>
          <DetailHost>
            <SectionPort token="task" id="aaaaaaaa-0000-0000-0000-000000000000" />
          </DetailHost>
        </CanvasProvider>
      </Provider>,
    );
  });

  // The port is bound (the provider is mounted) and draws its placeholder while it loads.
  expect(container.querySelector('[data-testid="no-port"]')).toBeNull();
  expect(container.querySelector('[aria-label="Loading custom fields"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="custom-fields"]')).toBeNull();

  await flush();

  expect(mockEvaluated).toEqual(["EntityCustomFields"]);
  expect(container.querySelector('[aria-label="Loading custom fields"]')).toBeNull();
  expect(container.querySelector('[data-testid="custom-fields"]')?.textContent).toBe(
    "custom fields for task/aaaaaaaa-0000-0000-0000-000000000000",
  );
});
