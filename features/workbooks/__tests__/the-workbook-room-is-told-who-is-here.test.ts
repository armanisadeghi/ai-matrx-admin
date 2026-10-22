/**
 * Collaborator chips showed raw user-id prefixes ("87a6e699") on Sheets (2026-10-22): the editor never gave the room a
 * name. Docs passes the signed-in person's display name; Sheets must hand over the same name and picture, from the
 * same selectors, or every other seat reads a stranger's id.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const editor = readFileSync(join(__dirname, "../components/WorkbookEditor.tsx"), "utf8");
const room = readFileSync(join(__dirname, "../collab/workbookOrderedRoom.ts"), "utf8");

it("the editor opens the room with the person's name and picture", () => {
  expect(editor).toMatch(/startWorkbookOrderedRoom\(\{[\s\S]*displayName: selectDisplayName\(/);
  expect(editor).toMatch(/avatarUrl: selectActiveUserAvatarUrl\(/);
});

it("the room forwards both to the office room", () => {
  expect(room).toMatch(/a\.displayName \? \{ displayName: a\.displayName \}/);
  expect(room).toMatch(/a\.avatarUrl \? \{ avatarUrl: a\.avatarUrl \}/);
});
