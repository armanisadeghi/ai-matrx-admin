/**
 * Extensions → Macros. Univer's action recorder watches the commands a person runs; its own "save" only
 * downloads a JSON file and its "replay" asks for one. Here a recording is kept on the workbook
 * (`sheet_extras.macros`) under a name, and replayed from the menu. Replay always runs on the active sheet.
 */

import { ActionRecorderService, ActionReplayService } from "@univerjs/action-recorder";

import type { SheetMacro } from "./sheet-row-extras";

interface InjectorLike {
  get<T>(token: unknown): T;
}

type RecorderInternals = {
  recording: boolean;
  /** The commands and operations seen since `startRecording`. */
  _recorded: { id: string; params?: unknown; type?: number }[];
  startRecording(replaceId?: boolean): void;
  stopRecording(): void;
};

export function isRecording(injector: InjectorLike): boolean {
  return injector.get<RecorderInternals>(ActionRecorderService).recording;
}

export function startMacroRecording(injector: InjectorLike): void {
  const svc = injector.get<RecorderInternals>(ActionRecorderService);
  if (svc.recording) svc.stopRecording();
  svc.startRecording(false);
}

/** Stop and return what was recorded (null when nothing was). Never downloads a file. */
export function finishMacroRecording(injector: InjectorLike, name: string, id: string, now = new Date()): SheetMacro | null {
  const svc = injector.get<RecorderInternals>(ActionRecorderService);
  // Selection moves are kept (later commands act on them) but alone they are not a macro.
  const commands = svc._recorded.slice();
  const meaningful = commands.filter((c) => !/selection/i.test(c.id));
  svc.stopRecording();
  if (!meaningful.length) return null;
  return {
    id,
    name,
    commands: JSON.parse(JSON.stringify(commands.map((c) => ({ id: c.id, params: c.params })))) as SheetMacro["commands"],
    savedAt: now.toISOString(),
  };
}

export function cancelMacroRecording(injector: InjectorLike): void {
  injector.get<RecorderInternals>(ActionRecorderService).stopRecording();
}

/** Replay a saved macro on the active sheet. Resolves false when a command in it was refused. */
export async function replayMacro(injector: InjectorLike, macro: SheetMacro): Promise<boolean> {
  const replay = injector.get<{ replayCommands(commands: unknown[], options: { mode: "active" }): Promise<boolean> }>(ActionReplayService);
  return replay.replayCommands(JSON.parse(JSON.stringify(macro.commands)) as unknown[], { mode: "active" });
}
