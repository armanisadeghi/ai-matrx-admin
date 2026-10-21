/**
 * One FileContextMenu / FolderContextMenu mounts PER ROW. A row menu that subscribes to a whole
 * slice (all files, the selection) re-renders every row on every file change: O(rows^2) at boot,
 * which froze /files/all for ~10 s. A CLOSED row menu must read none of the heavy slices; only
 * the menu being used (open) may.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockFile = { id: "f", fileName: "a.txt", source: { kind: "cloud" }, deletedAt: null };
const mockFolder = { id: "d", folderName: "d", source: { kind: "cloud" }, deletedAt: null };
const heavy = { allFiles: jest.fn(() => ({})), allFolders: jest.fn(() => ({})), selection: jest.fn(() => ({ selectedIds: [] })) };

jest.mock("@/features/files/redux/selectors", () => ({
  selectAllFilesMap: (...a: unknown[]) => (heavy.allFiles as (...x: unknown[]) => unknown)(...a),
  selectAllFoldersMap: (...a: unknown[]) => (heavy.allFolders as (...x: unknown[]) => unknown)(...a),
  selectSelection: (...a: unknown[]) => (heavy.selection as (...x: unknown[]) => unknown)(...a),
  selectFileById: () => mockFile,
  selectFolderById: () => mockFolder,
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppStore: () => ({ getState: () => ({}) }),
  useAppSelector: (sel: (s: unknown) => unknown) => sel({}),
}));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => "/" }));
jest.mock("@/features/files/components/core/FileActions/useFileActions", () => ({ useFileActions: () => ({}) }));
jest.mock("@/features/files/components/core/FileActions/useFolderActions", () => ({ useFolderActions: () => ({}) }));

import { FileContextMenu } from "@/features/files/components/core/FileContextMenu/FileContextMenu";
import { FolderContextMenu } from "@/features/files/components/core/FolderContextMenu/FolderContextMenu";

it("500 closed row menus read no whole-store slice", () => {
  const rows = Array.from({ length: 500 }, (_, i) => (
    <div key={i}>
      <FileContextMenu fileId={`f${i}`}><span>f</span></FileContextMenu>
      <FolderContextMenu folderId={`d${i}`}><span>d</span></FolderContextMenu>
    </div>
  ));
  renderToStaticMarkup(<>{rows}</>);
  expect(heavy.allFiles).not.toHaveBeenCalled();
  expect(heavy.selection).not.toHaveBeenCalled();
  expect(heavy.allFolders).not.toHaveBeenCalled();
});
