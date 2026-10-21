// CLOSE-LINK lane shared bits: admin + member record clients in the walk organization, a disposable-table registry that is archived at the end.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
export { admin, member, must, say, ORG } from "./at-fix-j-lib.mjs";
export const STATE = process.env.HOME + "/lane-resume/closelink/state.json";
export const loadState = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { tables: [] });
export const saveState = (s) => writeFileSync(STATE, JSON.stringify(s, null, 1));
export const remember = (id, name) => { const s = loadState(); s.tables.push({ id, name, at: new Date().toISOString() }); saveState(s); };
export const err = (r) => (r.ok ? null : `${r.error?.message ?? ""}${r.error?.hint ? " | hint: " + r.error.hint : ""}`.slice(0, 400));
