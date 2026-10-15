'use strict';
// node scripts/agent-harness/install-forward-only.test.cjs
//
// Proves THE SHARED INSTALL ONLY MOVES FORWARD through the REAL gate path: a throwaway checkout
// holds copies of install-gate.cjs + install-forward-only.cjs (so the gate's REPO_ROOT is the
// fixture), and each case runs the gate exactly as .pnpmfile.cjs does — a fresh node process whose
// argv is the pnpm command (argv[1] stands in for pnpm's own script path). RED: the 2026-10-15 rollback (`install --frozen-lockfile` with a
// lockfile on api 0.1.24 over an installed 0.1.26) must exit 1 naming the package and its caller.
// GREEN: a forward install passes and lands in .matrx-harness/install-history.jsonl.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HERE = __dirname;
const fo = require('./install-forward-only.cjs');

function lockfile(versions) {
  const deps = Object.entries(versions)
    .map(([n, v]) => `      '${n}':\n        specifier: latest\n        version: ${v}(react@19.3.0)\n`)
    .join('');
  return `lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies:\n${deps}      react:\n        specifier: latest\n        version: 19.3.0\n\n  packages/demo:\n    dependencies:\n      '@ai-matrx/api':\n        specifier: latest\n        version: 0.0.1\n\npackages:\n\n  '@ai-matrx/api@0.0.1':\n    resolution: {integrity: sha512-x}\n`;
}

function fixture(lockVersions, installed) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'forward-only-')));
  fs.mkdirSync(path.join(root, 'scripts', 'agent-harness'), { recursive: true });
  for (const f of ['install-gate.cjs', 'install-forward-only.cjs']) {
    fs.copyFileSync(path.join(HERE, f), path.join(root, 'scripts', 'agent-harness', f));
  }
  fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), lockfile(lockVersions));
  for (const [name, version] of Object.entries(installed)) {
    const dir = path.join(root, 'node_modules', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version }));
  }
  return root;
}

function gate(root, args, env = {}) {
  const r = spawnSync(
    process.execPath,
    ['-e', `require(${JSON.stringify(path.join(root, 'scripts/agent-harness/install-gate.cjs'))}).run()`, 'pnpm', ...args],
    {
      encoding: 'utf8',
      env: { ...process.env, MATRX_PREVIEW_STATE_DIR: path.join(root, 'no-preview'), ...env },
    },
  );
  return { code: r.status, err: r.stderr };
}

function history(root) {
  try {
    return fs
      .readFileSync(path.join(root, '.matrx-harness', fo.HISTORY_NAME), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  FAIL  ${name}\n${String(e.stack || e).split('\n').slice(0, 6).join('\n')}`);
  }
}

check('versions compare by semver precedence', () => {
  assert.ok(fo.compareVersions('0.1.24', '0.1.26') < 0);
  assert.ok(fo.compareVersions('0.14.60', '0.14.59') > 0);
  assert.ok(fo.compareVersions('1.0.0-beta.2', '1.0.0') < 0);
  assert.ok(fo.compareVersions('1.0.0-beta.10', '1.0.0-beta.2') > 0);
  assert.equal(fo.compareVersions('0.3.7', '0.3.7'), 0);
});

check('only the ROOT importer is read, never a workspace package', () => {
  const v = fo.lockedRootVersions(lockfile({ '@ai-matrx/api': '0.1.24', '@ai-matrx/kit': '0.45.2' }));
  assert.deepEqual(v, { '@ai-matrx/api': '0.1.24', '@ai-matrx/kit': '0.45.2' });
});

check("this repo's own lockfile parses (the real format, not only the fixture's)", () => {
  const real = fs.readFileSync(path.join(HERE, '..', '..', 'pnpm-lock.yaml'), 'utf8');
  const v = fo.lockedRootVersions(real);
  assert.ok(Object.keys(v).length >= 10, `only ${Object.keys(v).length} @ai-matrx deps parsed`);
  for (const ver of Object.values(v)) assert.match(ver, /^\d+\.\d+\.\d+/);
});

check('RED: the 2026-10-15 rollback (older lockfile over newer installs) is refused, naming who', () => {
  const root = fixture(
    { '@ai-matrx/api': '0.1.24', '@ai-matrx/kit': '0.45.2' },
    { '@ai-matrx/api': '0.1.26', '@ai-matrx/kit': '0.45.3' },
  );
  const r = gate(root, ['install', '--frozen-lockfile']);
  assert.equal(r.code, 1, r.err);
  assert.match(r.err, /INSTALL REFUSED/);
  assert.match(r.err, /@ai-matrx\/api 0\.1\.26 -> 0\.1\.24/);
  assert.match(r.err, /@ai-matrx\/kit 0\.45\.3 -> 0\.45\.2/);
  assert.match(r.err, /Asked by/);
  const h = history(root);
  assert.equal(h.length, 1);
  assert.equal(h[0].refused, 'downgrade');
  assert.ok(h[0].ancestry.length >= 1, 'the refusal did not record its caller');
});

check('GREEN: a forward install passes and is recorded with its caller', () => {
  const root = fixture({ '@ai-matrx/api': '0.1.26' }, { '@ai-matrx/api': '0.1.24' });
  const r = gate(root, ['install', '--frozen-lockfile']);
  assert.equal(r.code, 0, r.err);
  const h = history(root);
  assert.equal(h.length, 1);
  assert.equal(h[0].command, 'pnpm install --frozen-lockfile');
  assert.ok(!h[0].refused);
  assert.ok(h[0].ancestry.length >= 1);
});

check('an update is never refused (its result is newer than the lockfile on disk)', () => {
  const root = fixture({ '@ai-matrx/api': '0.1.24' }, { '@ai-matrx/api': '0.1.26' });
  assert.equal(gate(root, ['update', '-r', '@ai-matrx/*', '--latest']).code, 0);
});

check('a lockfile-only refresh never touches node_modules, so it is never refused', () => {
  const root = fixture({ '@ai-matrx/api': '0.1.24' }, { '@ai-matrx/api': '0.1.26' });
  assert.equal(gate(root, ['install', '--lockfile-only']).code, 0);
});

check(`going back on purpose: ${fo.ALLOW_ENV}=1`, () => {
  const root = fixture({ '@ai-matrx/api': '0.1.24' }, { '@ai-matrx/api': '0.1.26' });
  const r = gate(root, ['install'], { [fo.ALLOW_ENV]: '1' });
  assert.equal(r.code, 0, r.err);
  assert.match(r.err, /DOWNGRADE ALLOWED/);
});

check('a fresh checkout (nothing installed) installs freely', () => {
  const root = fixture({ '@ai-matrx/api': '0.1.24' }, {});
  assert.equal(gate(root, ['install', '--frozen-lockfile']).code, 0);
});

if (failed) {
  console.log(`\ninstall-forward-only: ${failed} FAILED`);
  process.exit(1);
}
console.log('\ninstall-forward-only: all cases pass');
