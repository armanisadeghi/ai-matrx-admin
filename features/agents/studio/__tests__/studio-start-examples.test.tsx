/**
 * Build-first: "Describe it" asks for no examples up front. One quiet "Add a real example"
 * opens the shared Examples field with a single box (it used to open with three empty boxes).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (props: Record<string, unknown>) => <textarea aria-label={props["aria-label"] as string} readOnly />,
}));
jest.mock("@/components/official/VoiceTextarea", () => ({
  VoiceTextarea: (props: Record<string, unknown>) => <textarea aria-label={props["aria-label"] as string} readOnly />,
}));
jest.mock("@/features/agents/factory/service", () => ({ startAgentBuild: jest.fn() }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));
jest.mock("@/lib/coming-soon/announce", () => ({ announceComingSoon: jest.fn() }));

import { StudioStart } from "../components/StudioStart";

describe("StudioStart — Describe it", () => {
  it("opens with no example boxes and adds one on request", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      createRoot(host).render(<StudioStart onStart={() => undefined} onBack={() => undefined} initialJob="Write listing descriptions" />);
    });
    expect(host.querySelectorAll('textarea[aria-label^="Example"]')).toHaveLength(0);
    const add = host.querySelector('[data-testid="studio-add-example"]') as HTMLButtonElement;
    expect(add).not.toBeNull();
    act(() => add.click());
    expect(host.querySelectorAll('textarea[aria-label^="Example"]')).toHaveLength(1);
    expect(host.querySelector('[data-testid="studio-add-example"]')).toBeNull();
  });
});
