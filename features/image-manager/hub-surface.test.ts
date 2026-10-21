import { parseImageHubDestination } from "./hub-surface";

const sections = [{ title: "Manager", landing: "/images/manager", links: [{ href: "/images/upload", label: "Upload", description: "Upload an image" }] }];

it("opens only a catalog tool or section home, including no external/unknown routes", () => {
  expect(parseImageHubDestination("/images/upload", sections)).toBe("/images/upload");
  expect(parseImageHubDestination("/images/manager", sections)).toBe("/images/manager");
  for (const value of ["https://example.com", "/images/invented", null, { href: "/images/upload" }]) {
    expect(() => parseImageHubDestination(value, sections)).toThrow();
  }
});
