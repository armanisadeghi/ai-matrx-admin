import { inputModeOf, siteOf, understandInput } from "../input-understanding";

describe("understandInput", () => {
  it("keeps plain words as a search", () => {
    expect(understandInput("best pizza in chicago")).toEqual({ mode: "words", text: "best pizza in chicago" });
    expect(inputModeOf("node.js tutorial")).toBe("words");
    expect(inputModeOf("node.js")).toBe("words");
    expect(inputModeOf("")).toBe("words");
  });

  it("reads a bare @handle as a handle", () => {
    expect(understandInput("@nike")).toEqual({ mode: "handle", handle: "nike" });
    expect(inputModeOf("@ nike")).toBe("words");
  });

  it("reads a profile link as a profile lookup", () => {
    expect(understandInput("https://www.tiktok.com/@nike")).toMatchObject({ mode: "profile", platform: "tiktok", handle: "nike" });
    expect(understandInput("instagram.com/nike/")).toMatchObject({ mode: "profile", platform: "instagram", handle: "nike" });
  });

  it("reads a post link as a post", () => {
    expect(understandInput("https://www.tiktok.com/@nike/video/7350000000000000000")).toMatchObject({ mode: "post", platform: "tiktok" });
    expect(understandInput("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({ mode: "post", platform: "youtube" });
  });

  it("reads any other address as a page to read", () => {
    expect(understandInput("https://example.com/about")).toEqual({ mode: "link", url: "https://example.com/about" });
    expect(understandInput("nike.com")).toEqual({ mode: "link", url: "https://nike.com/" });
    expect(understandInput("www.tiktok.com/explore")).toMatchObject({ mode: "link" });
  });

  it("reads an image address as search-by-image", () => {
    expect(understandInput("https://cdn.example.com/a/photo.JPG?w=200")).toMatchObject({ mode: "image" });
  });

  it("names the site of an address", () => {
    expect(siteOf("https://www.example.com/a")).toBe("example.com");
  });
});
