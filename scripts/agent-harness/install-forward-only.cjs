'use strict';
//
// install-forward-only.cjs — the shared node_modules only moves FORWARD.
//
// THE INCIDENT (2026-10-15, ship-all 2026-10-15_15-14-02): sync-main's package step updated the
// shared checkout's @ai-matrx packages in place (api 0.1.24 -> 0.1.26, kit 0.45.2 -> 0.45.3, ...),
// judged the update unsafe, and put it back with `pnpm install --frozen-lockfile` against the
// OLDER lockfile (0.1.26 -> 0.1.24). The :3001 preview restarts whenever node_modules changes, so
// the one dev server every agent tests on went down twice per sync, and nothing said who did it.
// sync-main now runs its trial in a scratch tree (scripts/sync-main.py, update_matrx_packages);
// this gate is the class guard for every other door: an `install` whose lockfile would put a
// DIRECT @ai-matrx dependency at an older version than the one installed is refused, loudly,
// naming each package and the process that asked. MATRX_ALLOW_PACKAGE_DOWNGRADE=1 goes back on
// purpose.
//
// Every install that gets past the gate is also recorded — time, command, and the process chain
// that ran it — in .matrx-harness/install-history.jsonl, so the next "who installed under the
// preview?" is one `tail` away.
//
// Loaded from scripts/agent-harness/install-gate.cjs (inside .pnpmfile.cjs, before pnpm relinks
// anything). Self-test: node scripts/agent-harness/install-forward-only.test.cjs

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SCOPE = '@ai-matrx/';
const ALLOW_ENV = 'MATRX_ALLOW_PACKAGE_DOWNGRADE';
const HISTORY_NAME = 'install-history.jsonl';
const HISTORY_MAX_BYTES = 2 * 1024 * 1024; // the history keeps its newest ~2 MB
const ANCESTRY_DEPTH = 8;

/** {name: version} for the ROOT importer's direct @ai-matrx dependencies in pnpm-lock.yaml text. */
function lockedRootVersions(lockText) {
  const out = {};
  const lines = String(lockText || '').split('\n');
  let i = lines.indexOf('importers:');
  if (i < 0) return out;
  // Find the root importer block "  .:" and read until the next two-space key.
  for (i += 1; i < lines.length && lines[i] !== '  .:'; i += 1) {
    if (/^\S/.test(lines[i])) return out;
  }
  let name = null;
  for (i += 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^ {0,2}\S/.test(line)) break; // next importer or next top-level section
    const dep = /^ {6}'?(@ai-matrx\/[^':]+)'?:\s*$/.exec(line);
    if (dep) {
      name = dep[1];
      continue;
    }
    const ver = /^ {8}version: ([^\s(]+)/.exec(line);
    if (ver && name) {
      if (/^\d/.test(ver[1])) out[name] = ver[1];
      name = null;
    } else if (/^ {6}\S/.test(line)) {
      name = null;
    }
  }
  return out;
}

/** {name: version} for every @ai-matrx package installed directly under root/node_modules. */
function installedVersions(root) {
  const out = {};
  const scopeDir = path.join(root, 'node_modules', '@ai-matrx');
  let names = [];
  try {
    names = fs.readdirSync(scopeDir);
  } catch {
    return out;
  }
  for (const n of names) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(scopeDir, n, 'package.json'), 'utf8'));
      if (pkg && typeof pkg.version === 'string') out[SCOPE + n] = pkg.version;
    } catch {
      /* not a package (or a dangling link): nothing installed to protect */
    }
  }
  return out;
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(v));
  if (!m) return null;
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] };
}

/** <0 when a is older than b, 0 equal, >0 newer (semver precedence); null when unparseable. */
function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return null;
  for (let k = 0; k < 3; k += 1) if (x.nums[k] !== y.nums[k]) return x.nums[k] - y.nums[k];
  if (!x.pre.length || !y.pre.length) return (x.pre.length ? -1 : 0) + (y.pre.length ? 1 : 0);
  for (let k = 0; k < Math.max(x.pre.length, y.pre.length); k += 1) {
    if (x.pre[k] === undefined) return -1;
    if (y.pre[k] === undefined) return 1;
    const xn = /^\d+$/.test(x.pre[k]);
    const yn = /^\d+$/.test(y.pre[k]);
    if (xn && yn && Number(x.pre[k]) !== Number(y.pre[k])) return Number(x.pre[k]) - Number(y.pre[k]);
    if (xn !== yn) return xn ? -1 : 1;
    if (x.pre[k] !== y.pre[k]) return x.pre[k] < y.pre[k] ? -1 : 1;
  }
  return 0;
}

/** [{name, installed, locked}] — every direct @ai-matrx dependency the lockfile would move BACK. */
function plannedDowngrades(root) {
  let lockText = '';
  try {
    lockText = fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8');
  } catch {
    return [];
  }
  const locked = lockedRootVersions(lockText);
  const installed = installedVersions(root);
  const out = [];
  for (const [name, lockedV] of Object.entries(locked)) {
    const have = installed[name];
    if (!have) continue;
    const c = compareVersions(lockedV, have);
    if (c !== null && c < 0) out.push({ name, installed: have, locked: lockedV });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The process chain that ran this install, nearest first: ["<pid> <command>", ...]. */
function ancestry(startPid = process.pid, depth = ANCESTRY_DEPTH) {
  const chain = [];
  let pid = startPid;
  for (let k = 0; k < depth && Number.isInteger(pid) && pid > 1; k += 1) {
    let line = '';
    try {
      line = execFileSync('ps', ['-o', 'ppid=,command=', '-p', String(pid)], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      break;
    }
    const m = /^(\d+)\s+(.*)$/.exec(line);
    if (!m) break;
    chain.push(`${pid} ${m[2].slice(0, 240)}`);
    pid = Number(m[1]);
  }
  return chain;
}

function recordInstall(lockDir, entry) {
  try {
    fs.mkdirSync(lockDir, { recursive: true });
    const file = path.join(lockDir, HISTORY_NAME);
    try {
      if (fs.statSync(file).size > HISTORY_MAX_BYTES) {
        const text = fs.readFileSync(file, 'utf8');
        fs.writeFileSync(file, text.slice(text.length - HISTORY_MAX_BYTES / 2).replace(/^[^\n]*\n/, ''));
      }
    } catch {
      /* first record */
    }
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  } catch {
    /* the record never blocks an install */
  }
}

/** The first non-option word of a pnpm command line ("install", "update", ...). */
function verbOf(command) {
  for (const w of String(command || '').split(/\s+/)) if (w && !w.startsWith('-')) return w;
  return '';
}

/**
 * Refuse (exit 1) an install that would move a direct @ai-matrx dependency backwards.
 * `say`/`refuse` come from install-gate so the output reads as one gate.
 */
function guardForward({ root, command, refuse, say, env = process.env }) {
  const verb = verbOf(command);
  if (verb !== 'install' && verb !== 'i') return [];
  const downgrades = plannedDowngrades(root);
  if (!downgrades.length) return [];
  const moves = downgrades.map((d) => `${d.name} ${d.installed} -> ${d.locked}`);
  const chain = ancestry();
  if (env[ALLOW_ENV]) {
    say(`DOWNGRADE ALLOWED (${ALLOW_ENV}=1): ${moves.join(', ')}`);
    return downgrades;
  }
  recordInstall(path.join(root, '.matrx-harness'), {
    at: new Date().toISOString(),
    refused: 'downgrade',
    command: `pnpm ${command}`,
    moves,
    ancestry: chain,
  });
  refuse([
    'INSTALL REFUSED — this lockfile is OLDER than the @ai-matrx packages installed here, and the',
    'install would move them BACK. Every node_modules change restarts the shared :3001 preview,',
    'so a backwards install costs every agent their browser test and fixes nothing.',
    '',
    `Command: pnpm ${command}`,
    ...moves.map((m) => `  ${m}`),
    '',
    'Asked by (nearest process first):',
    ...chain.map((c) => `  ${c}`),
    '',
    'What to do instead:',
    '  - The installed packages are newer than this lockfile, so move the LOCKFILE forward:',
    '      pnpm sync:matrx-packages',
    '    and commit pnpm-lock.yaml.',
    `  - Going back on purpose (a package release broke something): ${ALLOW_ENV}=1 pnpm ${command}`,
  ]);
  return downgrades;
}

module.exports = {
  ALLOW_ENV,
  HISTORY_NAME,
  lockedRootVersions,
  installedVersions,
  compareVersions,
  plannedDowngrades,
  ancestry,
  recordInstall,
  verbOf,
  guardForward,
};
