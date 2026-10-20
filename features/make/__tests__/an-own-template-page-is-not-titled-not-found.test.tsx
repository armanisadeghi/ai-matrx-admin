// features/make/__tests__/an-own-template-page-is-not-titled-not-found.test.tsx — LANE AT-FIX-H3 (2026-10-19).
//
// THE USE CASE. Priya saves her base as a template and opens it: the page shows her template, but the browser tab said
// "Template not found" because the public read (platform templates only) does not know an organization's own template.
// SUT: the real /templates/[slug] generateMetadata over a public read that answers nothing.
// BREAKS THIS CATCHES (RED on the old page): a saved template's id titled "Template not found" · and the other way: a
// made-up address no longer titled "Template not found".

jest.mock("../gallery/publicCatalogue.server", () => ({
  readPublicCatalogue: async () => ({ state: "open", cards: [] }),
  readTemplatePage: async () => null,
}));
jest.mock("@/features/spaces/public/TemplatePackPreview", () => ({ TemplatePackPreview: () => null }));
jest.mock("@/features/spaces/public/SpaceTemplateIcon", () => ({ SpaceTemplateIcon: () => null, SpaceTemplateCover: () => null }));
jest.mock("../gallery/TemplateLivePreview", () => ({ TemplateLivePreview: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../gallery/TemplateUseAction", () => ({ TemplateUseAction: () => null, SpaceTemplateUseAction: () => null, OwnTemplateFallback: () => null }));

import { generateMetadata } from "@/app/(public)/templates/[slug]/page";

const props = (slug: string) => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });

it("an organization's own template id is titled as a saved template, not 'not found'", async () => {
  const meta = await generateMetadata(props("6b18956d-6bbc-4b8a-8545-f427f987135d"));
  expect(meta.title).toBe("Saved template");
  expect(meta.robots).toMatchObject({ index: false });
});

it("a made-up address is still 'Template not found'", async () => {
  const meta = await generateMetadata(props("no-such-template"));
  expect(meta.title).toBe("Template not found");
});
