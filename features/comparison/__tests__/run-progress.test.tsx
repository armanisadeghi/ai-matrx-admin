import { act } from "react";
import { createRoot } from "react-dom/client";

import { parseRunState, stageOf } from "../contract";
import { RunProgress } from "../components/RunProgress";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = (error: string, errorCode: string | null) => ({
  index: 0, label: "Acme", stage: "done" as const, stageLabel: "", current: null, total: null,
  done: true, error, errorCode,
});

async function render(items: ReturnType<typeof item>[]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<RunProgress kind="companies_reviews" kindLabel="Companies" items={items}
      identities={[{ name: "Acme" }]} startedAt={Date.now()} />);
  });
  return host;
}

describe("a failed item says why, in the server's words", () => {
  it("a read failure is not 'Not found' and shows the server sentence", async () => {
    const host = await render([item("We couldn't read Acme right now.", "provider_failed")]);
    expect(host.textContent).toContain("We couldn't read Acme right now.");
    expect(host.textContent).not.toContain("Not found");
  });
  it("only the empty code reads 'Not found'", async () => {
    const host = await render([item("We could not find Acme.", "empty")]);
    expect(host.textContent).toContain("Not found");
  });
});

describe("the stage key", () => {
  it("accepts the old server key as 'reading'", () => {
    expect(stageOf("waiting_for_provider")).toBe("reading");
    expect(stageOf("reading")).toBe("reading");
    const s = parseRunState({ run_id: "r", items: [{ index: 0, label: "A", stage: "waiting_for_provider" }] });
    expect(s?.items[0].stage).toBe("reading");
  });
});
