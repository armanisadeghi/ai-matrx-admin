/** @jest-environment jsdom */
import type { DataSource } from "../contract";
import { dataTableOffer } from "../offer";
import { isComposerPasteTarget } from "../usePasteDataOffer";

jest.mock("@/lib/toast", () => ({ toast: jest.fn() }));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({ useOrganizationRequired: jest.fn() }));
jest.mock("@/components/ui/file-upload/useClipboardPaste", () => ({ useClipboardPaste: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: jest.fn() }));

const trustpilot: DataSource = {
  key: "trustpilot_reviews",
  label: "Trustpilot reviews",
  group: "Reviews",
  input: { kind: "url", fields: [{ name: "url", label: "Link", required: true }] },
  example_url: "https://www.trustpilot.com/review/example.com",
  verified: true,
  usd_per_record: 0.002,
};

describe("the main chat composer paste offer", () => {
  it("a paste in the composer's textarea is a target; a paste anywhere else is not", () => {
    document.body.innerHTML = `<div data-composer-size="md"><textarea id="box"></textarea></div><textarea id="other"></textarea>`;
    expect(isComposerPasteTarget(document.getElementById("box"))).toBe(true);
    expect(isComposerPasteTarget(document.getElementById("other"))).toBe(false);
    expect(isComposerPasteTarget(null)).toBe(false);
  });
  it("the pasted Trustpilot address matches its source; plain words and several lines do not", () => {
    expect(dataTableOffer("https://www.trustpilot.com/review/allbirds.com", [trustpilot])?.source.key).toBe("trustpilot_reviews");
    expect(dataTableOffer("hello there", [trustpilot])).toBeNull();
    expect(dataTableOffer("https://www.trustpilot.com/review/a.com\nhttps://www.trustpilot.com/review/b.com", [trustpilot])).toBeNull();
  });
});
