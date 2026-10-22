/**
 * The file peek opens from the chip, never from its remove × — aiming at ×
 * must not drop a hover card over the page (2026-10-14).
 */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { FileResourceChip } from "./FileResourceChip";

jest.mock("@ai-matrx/media/files/engine/redux/hooks", () => ({ useAppSelector: () => null }));
jest.mock("@ai-matrx/media/files/engine/redux/selectors", () => ({ selectFileById: () => null }));
jest.mock("@ai-matrx/media/files/engine/hooks/useEnsureCloudFile", () => ({ useEnsureCloudFile: () => undefined }));
jest.mock("@ai-matrx/media/files/engine/redux/file-hydration", () => ({ FILE_RENDER_FIELDS: [] }));
jest.mock("@ai-matrx/media/react", () => ({ MediaThumbnail: () => null }));
jest.mock("@ai-matrx/media/files/engine/host/ui", () => ({
  ...jest.requireActual("@ai-matrx/media/files/engine/host/ui"),
  FileMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  openFilePreview: jest.fn(),
}));
jest.mock("@ai-matrx/records-ui/entity-ref", () => ({
  ...jest.requireActual("@ai-matrx/records-ui/entity-ref"),
  EntityRef: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

describe("FileResourceChip hover peek", () => {
  it("keeps the remove button outside the hover-card trigger", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(<FileResourceChip fileId="f1" fileHint={{ file_name: "report.pdf" } as never} onRemove={() => undefined} />);
    });
    const remove = host.querySelector('button[aria-label^="Remove "]') as HTMLElement;
    expect(remove).not.toBeNull();
    // Radix stamps data-state on the HoverCardTrigger's element.
    expect(remove.closest("[data-state]")).toBeNull();
    expect(host.querySelector("[data-state]")).not.toBeNull();
    act(() => root.unmount());
    host.remove();
  });
});
