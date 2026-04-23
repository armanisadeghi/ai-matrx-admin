export * from "./codeWorkspaceSlice";
export { default as codeWorkspaceReducer } from "./codeWorkspaceSlice";

export * from "./tabsSlice";
export { default as codeTabsReducer } from "./tabsSlice";

export {
  default as codeTerminalReducer,
  selectCodeTerminal,
  selectTerminalOpen,
  selectTerminalActiveTab,
  selectTerminalLines,
  selectTerminalHistory,
  selectTerminalExecuting,
  setOpen as setTerminalOpen,
  toggleOpen as toggleTerminalOpen,
  setActiveTab as setTerminalActiveTab,
  appendLine,
  appendLines,
  clearLines,
  pushHistory,
  setExecuting,
} from "./terminalSlice";
export type { CodeTerminalState, TerminalLine } from "./terminalSlice";
