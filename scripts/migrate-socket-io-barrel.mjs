/**
 * Replace @/lib/redux/socket-io barrel imports with direct module paths.
 * Run: node scripts/migrate-socket-io-barrel.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const base = "@/lib/redux/socket-io";

const T = "selectors/socket-task-selectors";
const C = "selectors/socket-connection-selectors";
const R = "selectors/socket-response-selectors";

/** @type {Record<string, string>} */
const SYMBOL = Object.assign(
  Object.fromEntries(
    [
      "selectAllTasks",
      "selectAllTasksArray",
      "selectCurrentTaskId",
      "selectCurrentTask",
      "selectCurrentTaskFirstListenerId",
      "selectTaskById",
      "selectTaskStatus",
      "selectListenerIdsByTaskId",
      "selectTaskListenerIds",
      "selectTaskFirstListenerId",
      "selectFieldValue",
      "selectTaskNameById",
      "selectTaskDataById",
      "selectTaskValidationState",
      "selectTasksByConnectionId",
      "selectTasksByStatus",
      "selectTaskByListenerId",
      "selectTaskStreamingById",
      "selectTaskStreamingByListenerId",
      "selectTestMode",
      "selectBuildingTasksCount",
      "selectReadyTasksCount",
      "selectSubmittedTasksCount",
      "selectCompletedTasksCount",
      "selectErrorTasksCount",
      "selectRunningTasksCount",
    ].map((k) => [k, T]),
  ),
  Object.fromEntries(
    [
      "selectConnectionById",
      "selectPrimaryConnectionId",
      "selectAuthToken",
      "selectIsAdmin",
      "selectPredefinedConnections",
      "selectConnectionForm",
      "selectConnectionTestMode",
      "selectSocket",
      "selectSocketUrl",
      "selectNamespace",
      "selectConnectionStatus",
      "selectIsConnected",
      "selectIsAuthenticated",
      "selectConnectionAttempts",
      "selectConnectionError",
      "selectIsReconnecting",
      "selectPrimaryConnection",
      "selectAllConnections",
      "selectConnectionHealth",
      "selectAllConnectionsHealth",
      "selectAnyConnectionReconnecting",
      "selectActiveConnections",
      "selectFailedConnections",
    ].map((k) => [k, C]),
  ),
  Object.fromEntries(
    [
      "EMPTY_ARRAY",
      "selectAllResponses",
      "selectResponseByListenerId",
      "selectResponsesByTaskId",
      "selectResponseTextByListenerId",
      "selectResponseDataByListenerId",
      "selectFirstResponseDataByListenerId",
      "selectResponseInfoByListenerId",
      "selectResponseErrorsByListenerId",
      "selectResponseEndedByListenerId",
      "selectHasResponseErrorsByListenerId",
      "selectTaskResponsesByTaskId",
      "selectTaskResults",
      "selectIsTaskComplete",
      "selectTaskError",
      "selectPrimaryResponseForTask",
      "selectPrimaryResponseTextByTaskId",
      "selectPrimaryResponseDataByTaskId",
      "selectPrimaryResponseInfoByTaskId",
      "selectPrimaryResponseErrorsByTaskId",
      "selectPrimaryResponseEndedByTaskId",
      "selectHasPrimaryResponseErrorsByTaskId",
      "selectPrimaryCombinedTextByTaskId",
      "selectFirstPrimaryResponseDataByTaskId",
      "selectFirstPrimaryResponseInfoByTaskId",
      "selectFirstPrimaryResponseErrorByTaskId",
      "createTaskResponseSelectors",
      "selectCombinedText",
    ].map((k) => [k, R]),
  ),
  {
    createTask: "thunks/createTaskThunk",
    submitTask: "thunks/submitTaskThunk",
    createAndSubmitTask: "thunks/submitTaskThunk",
    submitTaskNew: "thunks/submitTaskThunk",
    updateTaskFieldByPath: "thunks/taskFieldThunks",
    arrayOperation: "thunks/taskFieldThunks",
    initializeTask: "slices/socketTasksSlice",
    setTaskFields: "slices/socketTasksSlice",
    updateTaskField: "slices/socketTasksSlice",
    updateNestedTaskField: "slices/socketTasksSlice",
    addToArrayField: "slices/socketTasksSlice",
    setArrayField: "slices/socketTasksSlice",
    updateArrayItem: "slices/socketTasksSlice",
    updateArrayItemById: "slices/socketTasksSlice",
    removeArrayItem: "slices/socketTasksSlice",
    validateTask: "slices/socketTasksSlice",
    setTaskStatus: "slices/socketTasksSlice",
    setTaskListenerIds: "slices/socketTasksSlice",
    setTaskStreaming: "slices/socketTasksSlice",
    completeTask: "slices/socketTasksSlice",
    setTaskError: "slices/socketTasksSlice",
    deleteTask: "slices/socketTasksSlice",
    resetTaskData: "slices/socketTasksSlice",
  },
  {
    SocketErrorObject: "socket.types",
  },
);

const TYPE_ONLY = new Set([
  "SocketErrorObject",
  "SocketConfig",
  "PredefinedConnection",
  "socketConnectionStatus",
  "SocketConnection",
  "SocketState",
  "ConnectionForm",
  "TaskStatus",
  "SocketTask",
  "SocketInfoObject",
  "SocketBrokerObject",
  "ResponseState",
  "ResponsesState",
]);

/**
 * @param {string} spec
 */
function baseName(spec) {
  return spec
    .trim()
    .split(/\s+as\s+/)[0]
    .trim();
}

/**
 * @param {string} inner
 * @param {'main' | 'thunks' | 'selectors'} mode
 */
function expandImport(inner, mode) {
  const parts = splitImports(inner);
  const groups = new Map();
  for (const p of parts) {
    const b = baseName(p);
    let rel = null;
    if (mode === "thunks") {
      if (b === "createTask") rel = "thunks/createTaskThunk";
      else if (["submitTask", "createAndSubmitTask", "submitTaskNew"].includes(b)) rel = "thunks/submitTaskThunk";
    } else {
      rel = SYMBOL[b] ?? null;
    }
    if (!rel) {
      throw new Error(`Unknown symbol in ${mode} import: ${b}`);
    }
    if (mode === "selectors" && (rel === "thunks/" || rel.startsWith("thunks/") || rel.startsWith("slices/"))) {
      throw new Error(`Invalid symbol for selectors barrel: ${b} -> ${rel}`);
    }
    const isType = TYPE_ONLY.has(b);
    const key = `${rel}::${isType ? "t" : "v"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p.trim());
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, specs]) => {
      const [rel, kind] = key.split("::");
      const spec = specs.join(", ");
      if (kind === "t") {
        return `import type { ${spec} } from "${base}/${rel}";`;
      }
      return `import { ${spec} } from "${base}/${rel}";`;
    })
    .join("\n");
}

/**
 * @param {string} inner
 */
function splitImports(inner) {
  const out = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "{" || ch === "<" || ch === "(") depth++;
    if (ch === "}" || ch === ">" || ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Use [^}]+ (not [\s\S]*?) so one match cannot span from an earlier "import {" to a later "}".
const patterns = [
  { mode: "main", re: /import(?:\s+type)?\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/redux\/socket-io['"];?\n?/g },
  { mode: "thunks", re: /import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/redux\/socket-io\/thunks['"];?\n?/g },
  { mode: "selectors", re: /import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/redux\/socket-io\/selectors['"];?\n?/g },
];

let changed = 0;
const tracked = execSync("git -C . ls-files '*.ts' '*.tsx'", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .map((s) => s.trim())
  .filter((f) => f && !f.startsWith(".claude/"));

for (const rel of tracked) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) continue;
  let text = fs.readFileSync(file, "utf8");
  let newText = text;
  for (const { mode, re } of patterns) {
    newText = newText.replace(re, (full, inner) => {
      try {
        return expandImport(inner, mode) + (full.endsWith("\n\n") ? "\n" : "\n");
      } catch (e) {
        e.message = `${file}: ${e.message}`;
        throw e;
      }
    });
  }
  if (newText !== text) {
    fs.writeFileSync(file, newText);
    changed++;
  }
}
console.log("migrate-socket-io-barrel: updated", changed, "files");
