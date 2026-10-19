import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ConnectorAccount, ConnectorCapabilityRollout } from "../health";
import { GOOGLE_SCOPE } from "@/lib/googleScopes";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/lib/toast", () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => selector({}),
  useAppDispatch: () => jest.fn(),
}));
jest.mock("@/lib/redux/slices/appContextSlice", () => ({
  selectOrganizationId: () => null,
}));
jest.mock("@/features/scopes/redux/selectors/tree", () => ({
  selectOrganizationsList: () => [],
}));
jest.mock("@/features/organizations/useOrganizationGatedControl", () => ({
  useOrganizationGatedControl: () => ({
    disabled: false,
    title: undefined,
    press: (callback: () => void) => callback,
  }),
}));
const mockIsCancelled = jest.fn(() => false);
jest.mock("@/providers/google-provider/GoogleApiProvider", () => ({
  isGoogleAuthorizationCancelled: (cause: unknown) => mockIsCancelled(cause),
  useGoogleAPI: () => ({ isGoogleLoaded: true }),
}));
jest.mock("../gmail-read-disclosure", () => ({
  confirmGmailReadDisclosure: async () => true,
  confirmGmailChangesDisclosure: async () => true,
}));

const run = jest.fn();
const runInThisTab = jest.fn();
jest.mock("../google-adapter", () => ({
  useGoogleConsentRunner: () => ({ run, runInThisTab, ready: true }),
  consentFailureAnswer: () => ({ sentence: "Approval failed.", details: null }),
}));

import { ConnectorConsentBody } from "../ConnectorConsentDialog";
import { ConsentFailureNotice } from "../ConsentFailureNotice";
import { GOOGLE_CONNECTOR_PROVIDER } from "../provider-config";

const provider = GOOGLE_CONNECTOR_PROVIDER;
const rollout: ConnectorCapabilityRollout[] = [
  ...new Set(provider.products.flatMap((product) => product.capabilityKeys)),
].map((capabilityKey) => ({
  capabilityKey,
  phase: "available",
  eligible: true,
  requiredScopes: [],
  ineligibleReason: null,
}));

const broadAccount: ConnectorAccount = {
  id: "harbor-ops-google",
  label: "operations@harbor.test",
  ownerKind: "person",
  organizationId: null,
  providerSubject: "harbor-ops-subject",
  connectionPurpose: "google_products",
  grantedScopes: [...provider.identityScopes, GOOGLE_SCOPE.driveFile],
  usable: true,
  statusLabel: "Connected",
  statusReason: "This account can authorize Google calls.",
  statusRemedy: null,
  lastVerifiedAt: "2026-10-19T12:00:00Z",
  lastRefusalSentence: null,
};

const youtubeAccount: ConnectorAccount = {
  ...broadAccount,
  id: "harbor-video-google",
  connectionPurpose: "youtube_isolated",
  grantedScopes: [
    ...provider.identityScopes,
    GOOGLE_SCOPE.youtubeReadonly,
    GOOGLE_SCOPE.youtubeAnalyticsReadonly,
  ],
};

let container: HTMLDivElement;
let root: Root;

function click(button: Element) {
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => (candidate.textContent ?? "").trim() === name,
  );
  if (!button) throw new Error(`Missing button: ${name}`);
  return button;
}

function ConsentFixture() {
  const [accounts, setAccounts] = useState<ConnectorAccount[]>([]);
  return (
    <ConnectorConsentBody
      provider={provider}
      accounts={accounts}
      rollout={rollout}
      isLoading={false}
      rolloutUnavailable={false}
      errorMessage={null}
      initialProductKeys={["workspace_files", "youtube"]}
      presentation="dialog"
      onDone={jest.fn()}
      refetch={async () => {
        const next =
          run.mock.calls.length > 1
            ? [broadAccount, youtubeAccount]
            : [broadAccount];
        setAccounts(next);
        return next;
      }}
    />
  );
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  run
    .mockResolvedValueOnce({ connectionId: broadAccount.id })
    .mockResolvedValueOnce({ connectionId: youtubeAccount.id });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  run.mockReset();
  runInThisTab.mockReset();
  mockIsCancelled.mockReset();
  mockIsCancelled.mockReturnValue(false);
});

it("requires two explicit presses and sends YouTube only on the second one", async () => {
  await act(async () => root.render(<ConsentFixture />));

  await act(async () => {
    click(buttonNamed(provider.dialog.cta));
    await Promise.resolve();
  });

  expect(run).toHaveBeenCalledTimes(1);
  expect(run.mock.calls[0]?.[0]).toEqual(
    expect.objectContaining({
      connectionPurpose: "google_products",
      targetAccountId: null,
    }),
  );
  expect(run.mock.calls[0]?.[0].products.map(({ key }: { key: string }) => key)).toEqual([
    "workspace_files",
  ]);
  expect(run.mock.calls[0]?.[0].scopes).not.toContain(
    GOOGLE_SCOPE.youtubeReadonly,
  );
  expect(container.textContent).toContain("Continue with YouTube");
  expect(container.textContent).not.toContain("Done");

  await act(async () => Promise.resolve());
  expect(run).toHaveBeenCalledTimes(1);

  await act(async () => {
    click(buttonNamed("Continue with YouTube"));
    await Promise.resolve();
  });

  expect(run).toHaveBeenCalledTimes(2);
  expect(run.mock.calls[1]?.[0]).toEqual(
    expect.objectContaining({
      connectionPurpose: "youtube_isolated",
      targetAccountId: null,
    }),
  );
  expect(run.mock.calls[1]?.[0].products.map(({ key }: { key: string }) => key)).toEqual([
    "youtube",
  ]);
  expect(run.mock.calls[1]?.[0].scopes).not.toContain(GOOGLE_SCOPE.driveFile);
  expect(run.mock.calls[1]?.[1]).toEqual(
    expect.objectContaining({
      owner: { type: "user" },
      loginHint: broadAccount.label,
    }),
  );
  expect(container.textContent).toContain("Done");
});

it("does not lose deferred YouTube intent through the same-tab fallback", async () => {
  await act(async () => root.render(<ConsentFixture />));

  await act(async () => click(buttonNamed("Pop-ups blocked? Continue in this tab")));

  expect(runInThisTab).not.toHaveBeenCalled();
  expect(container.textContent).toContain("two-step connection needs a pop-up");
  expect(container.textContent).toContain("return here for YouTube");
});

it("does not advance to YouTube when the first step is only partially granted", async () => {
  const partialAccount: ConnectorAccount = {
    ...broadAccount,
    grantedScopes: [...provider.identityScopes],
  };
  function PartialFixture() {
    const [accounts, setAccounts] = useState<ConnectorAccount[]>([]);
    return (
      <ConnectorConsentBody
        provider={provider}
        accounts={accounts}
        rollout={rollout}
        isLoading={false}
        rolloutUnavailable={false}
        errorMessage={null}
        initialProductKeys={["workspace_files", "gmail_send", "youtube"]}
        onDone={jest.fn()}
        refetch={async () => {
          setAccounts([partialAccount]);
          return [partialAccount];
        }}
      />
    );
  }
  await act(async () => root.render(<PartialFixture />));
  await act(async () => {
    click(buttonNamed(provider.dialog.cta));
    await Promise.resolve();
  });

  expect(run).toHaveBeenCalledTimes(1);
  expect(container.textContent).not.toContain("Continue with YouTube");
  expect(container.textContent).not.toContain("Done");
  expect(container.textContent).toContain("did not grant this one");
});

it("keeps the continuation bound until the returned account can be confirmed", async () => {
  function MissingAccountFixture() {
    return (
      <ConnectorConsentBody
        provider={provider}
        accounts={[]}
        rollout={rollout}
        isLoading={false}
        rolloutUnavailable={false}
        errorMessage={null}
        initialProductKeys={["workspace_files", "youtube"]}
        onDone={jest.fn()}
        refetch={async () => {}}
      />
    );
  }
  await act(async () => root.render(<MissingAccountFixture />));
  await act(async () => {
    click(buttonNamed(provider.dialog.cta));
    await Promise.resolve();
  });
  expect(run).toHaveBeenCalledTimes(1);
  expect(container.textContent).not.toContain("Continue with YouTube");
  expect(container.textContent).toContain("not available yet");
  expect(container.textContent).toContain("Refresh connections");

  await act(async () => {
    click(buttonNamed("Refresh connections"));
    await Promise.resolve();
  });
  expect(run).toHaveBeenCalledTimes(1);
});

it("keeps YouTube pending when the second approval is canceled", async () => {
  run.mockReset();
  run
    .mockResolvedValueOnce({ connectionId: broadAccount.id })
    .mockRejectedValueOnce(new Error("popup_closed"));
  mockIsCancelled.mockImplementation(
    (cause) => cause instanceof Error && cause.message === "popup_closed",
  );
  await act(async () => root.render(<ConsentFixture />));
  await act(async () => {
    click(buttonNamed(provider.dialog.cta));
    await Promise.resolve();
  });
  await act(async () => {
    click(buttonNamed("Continue with YouTube"));
    await Promise.resolve();
  });

  expect(run).toHaveBeenCalledTimes(2);
  expect(container.textContent).toContain("Continue with YouTube");
  expect(container.textContent).not.toContain("Done");
});

it("selects only actionable rows and Clear keeps held grants selected", async () => {
  const unavailableYouTube = rollout.map((row) =>
    row.capabilityKey === "youtube" || row.capabilityKey === "youtube_analytics"
      ? { ...row, eligible: false, phase: "pending" as const }
      : row,
  );
  await act(async () =>
    root.render(
      <ConnectorConsentBody
        provider={provider}
        accounts={[broadAccount]}
        rollout={unavailableYouTube}
        isLoading={false}
        rolloutUnavailable={false}
        errorMessage={null}
        refetch={async () => {}}
      />,
    ),
  );

  await act(async () => click(buttonNamed("Select all")));
  const youtubeSwitch = container.querySelector('[aria-label="Connect YouTube"]');
  expect(youtubeSwitch).toBeNull();
  const actionable = [
    ...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]:not(:disabled)'),
  ];
  expect(actionable.length).toBeGreaterThan(1);
  expect(actionable.every((button) => button.getAttribute("aria-checked") === "true")).toBe(
    true,
  );

  await act(async () => click(buttonNamed("Clear")));
  expect(
    container
      .querySelector('[aria-label="Do not connect Docs, Sheets & Drive files"]')
      ?.getAttribute("aria-checked"),
  ).toBe("true");
  expect(
    actionable.every((button) => button.getAttribute("aria-checked") === "false"),
  ).toBe(true);
});

it("keeps dialog actions outside the bounded content scroller", async () => {
  await act(async () => root.render(<ConsentFixture />));
  const scrollRegion = container.querySelector(
    "[data-connector-consent-scroll-region]",
  );
  expect(scrollRegion).not.toBeNull();
  expect(scrollRegion?.contains(buttonNamed("Cancel"))).toBe(false);
});

it("contains long diagnostics behind dismissible, bounded details", async () => {
  const details = `authorization_url=${"x".repeat(4000)}`;
  await act(async () =>
    root.render(
      <ConsentFailureNotice
        failure={{ sentence: "Google approval failed. Try again.", details }}
      />,
    ),
  );
  expect(container.textContent).not.toContain(details);
  await act(async () => click(buttonNamed("Show details")));
  const detailsNode = container.querySelector("[id]");
  expect(detailsNode?.className).toContain("max-h-40");
  expect(detailsNode?.className).toContain("overflow-y-auto");
  expect(detailsNode?.textContent).toBe(details);
  const dismiss = container.querySelector('[aria-label="Dismiss error"]');
  if (!dismiss) throw new Error("Missing dismiss error button");
  await act(async () => click(dismiss));
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
