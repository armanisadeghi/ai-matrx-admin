import {
  formatDownloadSize,
  matrxDesktopDownloadPath,
  parseMatrxDesktopFeed,
} from "./desktop-release";

const MAC = `version: 2026.1005.504
files:
  - url: Matrx2-2026.1005.504-arm64-mac.zip
    sha512: abc==
    size: 420107474
path: Matrx2-2026.1005.504-arm64-mac.zip
sha512: abc==
releaseDate: '2026-10-05T12:13:11.127Z'
`;

/** electron-builder's latest.yml for the per-user NSIS installer (matrx-desktop electron-builder.yml). */
const WINDOWS = `version: 2026.1018.900
files:
  - url: Matrx2-2026.1018.900-x64-setup.exe
    sha512: def==
    size: 310000000
path: Matrx2-2026.1018.900-x64-setup.exe
sha512: def==
releaseDate: '2026-10-18T10:00:00.000Z'
`;

/** latest-linux.yml with both of the Linux targets. */
const LINUX = `version: 2026.1018.900
files:
  - url: Matrx2-2026.1018.900-x86_64-linux.AppImage
    sha512: ghi==
    size: 330000000
    blockMapSize: 340000
  - url: Matrx2-2026.1018.900-amd64-linux.deb
    sha512: jkl==
    size: 250000000
path: Matrx2-2026.1018.900-x86_64-linux.AppImage
sha512: ghi==
releaseDate: '2026-10-18T10:00:00.000Z'
`;

describe("parseMatrxDesktopFeed", () => {
  it("Mac: follows the feed's path to the zip beside it", () => {
    expect(parseMatrxDesktopFeed(MAC, "mac")).toEqual({
      os: "mac",
      version: "2026.1005.504",
      url: "https://cdn.matrxserver.com/releases/matrx-desktop/mac/Matrx2-2026.1005.504-arm64-mac.zip",
      sizeBytes: 420107474,
      releaseDate: "2026-10-05T12:13:11.127Z",
    });
  });

  it("Windows: the installer in the win feed", () => {
    expect(parseMatrxDesktopFeed(WINDOWS, "windows")).toMatchObject({
      url: "https://cdn.matrxserver.com/releases/matrx-desktop/win/Matrx2-2026.1018.900-x64-setup.exe",
      sizeBytes: 310000000,
    });
  });

  it("Linux: the .deb when the feed carries one, else the AppImage", () => {
    expect(parseMatrxDesktopFeed(LINUX, "linux")).toMatchObject({
      url: "https://cdn.matrxserver.com/releases/matrx-desktop/linux/Matrx2-2026.1018.900-amd64-linux.deb",
      sizeBytes: 250000000,
    });
    const appImageOnly = LINUX.replace(/  - url: Matrx2-[^\n]+\.deb\n[^\n]+\n[^\n]+\n/, "");
    expect(parseMatrxDesktopFeed(appImageOnly, "linux")).toMatchObject({
      url: "https://cdn.matrxserver.com/releases/matrx-desktop/linux/Matrx2-2026.1018.900-x86_64-linux.AppImage",
      sizeBytes: 330000000,
    });
  });

  it("refuses a file that is not a bare name of that OS's kind", () => {
    for (const path of ["https://evil.example/a.zip", "../a.zip", "a.dmg", "a/b.zip"]) {
      expect(parseMatrxDesktopFeed(`version: 1\npath: ${path}\n`, "mac")).toBeNull();
    }
    expect(parseMatrxDesktopFeed("version: 1\npath: a.zip\n", "windows")).toBeNull();
    expect(parseMatrxDesktopFeed("version: 1\npath: a.exe\n", "linux")).toBeNull();
  });

  it("returns null for an unreadable feed", () => {
    expect(parseMatrxDesktopFeed("<html>oops</html>", "mac")).toBeNull();
  });

  it("each OS has its stable download address", () => {
    expect(matrxDesktopDownloadPath("mac")).toBe("/desktop/download");
    expect(matrxDesktopDownloadPath("windows")).toBe("/desktop/download?os=windows");
  });

  it("formats the size in plain megabytes", () => {
    expect(formatDownloadSize(420107474)).toBe("420 MB");
    expect(formatDownloadSize(null)).toBeNull();
  });
});
