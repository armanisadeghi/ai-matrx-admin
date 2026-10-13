"use client";

/**
 * THE ONE IMPLEMENTATION MODULE behind the context-item drawer bodies (`./registerContextBodies`,
 * code-splitting rule 3). Nothing imports it statically: the first note or task drawer that opens
 * loads the note editor and the task editor here, off every page's first paint.
 */

export { NoteBody, NoteFooter, NoteTitleActions } from "./NoteBody";
export { TaskBody } from "./TaskBody";
