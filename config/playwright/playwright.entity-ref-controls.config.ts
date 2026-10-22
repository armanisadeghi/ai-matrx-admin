import { defineConfig } from "@playwright/test";
// matrx-agent-traffic: exempt static fixtures only, no app or server request is made

/**
 * Real-browser hit-testing gate for EntityRef's hover-revealed doors. jsdom
 * cannot measure opacity, media queries, or elementFromPoint, which are the
 * three failure boundaries this gate protects.
 */
export default defineConfig({
  testDir: "../../features/data-tables/records-ui-host/__tests__/entity-ref/browser",
  outputDir: "../../.cache/playwright/entity-ref-controls",
  testMatch: /.*\.spec\.ts$/,
  reporter: [["list"]],
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 720 } } },
    {
      name: "phone-390",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
