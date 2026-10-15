/**
 * The two Univer editors keep routing Univer's notices to the app's single toaster, and no CSS
 * hides a second one (the package test proves the router; this proves the editors call it).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");

it("both Univer editors route their notices and configure the Univer host, and no CSS hides a second toaster", () => {
  for (const file of ["features/workbooks/components/WorkbookEditor.tsx", "features/documents/components/DocumentEditor.tsx"]) {
    const src = fs.readFileSync(path.join(root, file), "utf8");
    expect(src).toMatch(/routeUniverNotificationsToApp\(/);
    expect(src).toMatch(/import "@\/lib\/univer-host"/);
  }
  expect(fs.readFileSync(path.join(root, "app/globals.css"), "utf8")).not.toMatch(/\[data-sonner-toaster\]:not\(/);
});
