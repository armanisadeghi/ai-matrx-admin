#!/usr/bin/env bash
# prove.sh — run the overlays switch codemod on a scratch export and prove it.
#
#   bash scripts/overlays-convert/prove.sh [work dir]    (default: a fresh mktemp -d)
#
# Never touches the real tree or the real node_modules:
#   <work>/base  untouched `git archive origin/main` export (the baseline)
#   <work>/sw    the same export, switched by switch.ts
# Both symlink node_modules to the real install (read-only use). The package SOURCE is copied
# into each export as .overlays-src/ so its own imports resolve from the app's node_modules,
# exactly as the published package would; a scratch tsconfig maps "@ai-matrx/overlays/*" there.
# Then: the full type-check on both (new errors = switched minus baseline), the deleted-path
# re-grep, and a second codemod run that must change nothing.
set -euo pipefail

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PKG="${OVERLAYS_PKG:-$APP/../aidream/apps/shared/overlays}"
W="${1:-$(mktemp -d)}"
mkdir -p "$W"
echo "work dir: $W"

export_tree() {
  local dir="$1"
  if [ ! -d "$dir/app" ]; then
    mkdir -p "$dir"
    git -C "$APP" archive origin/main | tar -x -C "$dir"
  fi
  [ -e "$dir/node_modules" ] || ln -s "$APP/node_modules" "$dir/node_modules"
  if [ ! -d "$dir/.overlays-src" ]; then cp -R "$PKG/src" "$dir/.overlays-src"; fi
  cat > "$dir/tsconfig.scratch.json" <<EOF
{
  "extends": "./tsconfig.typecheck.json",
  "compilerOptions": {
    "incremental": false,
    "tsBuildInfoFile": null,
    "paths": {
      "@host/*": ["./*"],
      "@/app/(admin)/*": ["./app/(admin)/*", "./app/_admin_build_excluded/*"],
      "@/*": ["./*"],
      "@components/ui/*": ["./components/ui/*"],
      "@components/*": ["./components/*"],
      "/*": ["./public/*"],
      "@ai-matrx/overlays": ["./.overlays-src/index.ts"],
      "@ai-matrx/overlays/persistence/data": ["./.overlays-src/persistence-data.ts"],
      "@ai-matrx/overlays/*": ["./.overlays-src/*"]
    }
  }
}
EOF
}

export_tree "$W/base"
export_tree "$W/sw"

if [ ! -f "$W/sw/features/overlays/definitions/registry.ts" ]; then
  (cd "$APP" && npx tsx scripts/overlays-convert/switch.ts --root "$W/sw" --pkg "$PKG" --report "$W/run1.json") > "$W/run1.log" 2>&1 || { tail -40 "$W/run1.log"; exit 1; }
fi
tail -3 "$W/run1.log"
# the codemod scripts themselves are type-checked inside the switched tree
cp "$APP"/scripts/overlays-convert/*.ts "$W/sw/scripts/overlays-convert/"

tsc_count() {
  (cd "$1" && bash scripts/tsc-capped.sh tsc --noEmit --pretty false -p tsconfig.scratch.json > "$2" 2>&1 || true)
  grep -c "error TS" "$2" || true
}
echo "type-check baseline: $(tsc_count "$W/base" "$W/base.tsc.txt") errors"
echo "type-check switched: $(tsc_count "$W/sw" "$W/sw.tsc.txt") errors"
grep "error TS" "$W/base.tsc.txt" | sort > "$W/base.err" || true
grep "error TS" "$W/sw.tsc.txt" | sort > "$W/sw.err" || true
echo "new errors (in switched, not in baseline):"
comm -13 "$W/base.err" "$W/sw.err" | tee "$W/new.err" | head -80
echo "new error count: $(wc -l < "$W/new.err" | tr -d ' ')"

echo "re-grep: imports of deleted modules left in the switched tree:"
(cd "$W/sw" && grep -rEn --include='*.ts' --include='*.tsx' --include='*.mts' --exclude-dir=node_modules --exclude-dir=.overlays-src \
  -e 'features/overlays/(OverlayController|catalogue|openers/|callbacks/|boundary/|useCloseOverlaysOnNavigation)' \
  -e 'redux/slices/(overlaySlice|windowManagerSlice|urlSyncSlice|overlayDataSlice)' \
  -e 'redux/(overlaySchemaRegistry|thunks/overlayThunks)' \
  -e 'window-panels/(WindowPanel|WindowPersistence|WindowSelectionSurface|WindowTray|window-panel\.types|constants/|diagnostics/|hooks/useWindowPanel|mobile/|persistence/|popout/|url-sync/)' \
  -e 'window-panels/registry/(trayPreviewRegistry|windowRegistryTypes|windowRegistryMetadata)' \
  -e 'window-panels/utils/(lazy-bundle-guard|urlSyncIdentity|rectClamp|windowArrangements|autoOpenPlacement|mayRaiseUnbidden)' \
  -e 'window-panels/components/(WindowSidebar|LayoutIcon)' \
  -e 'resizable/MatrxFloatingFrame' -e 'utils/callbackManager' -e 'hooks/useCallbackManager' -e 'hooks/useOrchestrateSave' \
  -e '@/lib/refs' -e 'providers/persistance' \
  . | grep -E "from ['\"]|import\(|mock\(|require\(" | grep -v '^\./scripts/overlays-convert/' || echo "  none")

echo "idempotence: second run"
cp "$W/sw.tsc.txt" "$W/sw.tsc.before" 2>/dev/null || true
(cd "$W/sw" && find . -path ./node_modules -prune -o -path ./.overlays-src -prune -o -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.mts' -o -name '*.mjs' -o -name '*.css' -o -name '*.json' \) -print0 | sort -z | xargs -0 shasum) > "$W/hash1.txt"
(cd "$APP" && npx tsx scripts/overlays-convert/switch.ts --root "$W/sw" --pkg "$PKG" --report "$W/run2.json") > "$W/run2.log" 2>&1 || { tail -20 "$W/run2.log"; exit 1; }
(cd "$W/sw" && find . -path ./node_modules -prune -o -path ./.overlays-src -prune -o -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.mts' -o -name '*.mjs' -o -name '*.css' -o -name '*.json' \) -print0 | sort -z | xargs -0 shasum) > "$W/hash2.txt"
if diff -q "$W/hash1.txt" "$W/hash2.txt" > /dev/null; then echo "  second run changed nothing"; else echo "  SECOND RUN CHANGED FILES:"; diff "$W/hash1.txt" "$W/hash2.txt" | head -20; fi
tail -2 "$W/run2.log"

# jest: the overlay / window-panels suites plus every suite the switch edits, on both trees
JEST_PATHS="features/overlays features/window-panels features/connectors/__tests__ features/ai-watch/__tests__ components/agent-copy/copy-subset features/marketing/content-plan/components/__tests__/node-measure-window-boundary lib/extension-bridge features/notifications"
for d in base sw; do
  cat > "$W/$d/jest.scratch.config.ts" <<'JEST'
import base from "./jest.config.ts";
// Scratch-only: "@ai-matrx/overlays" resolves to the package SOURCE copied into .overlays-src.
const config = {
  ...base,
  moduleNameMapper: {
    "^@ai-matrx/overlays$": "<rootDir>/.overlays-src/index.ts",
    "^@ai-matrx/overlays/persistence/data$": "<rootDir>/.overlays-src/persistence-data.ts",
    "^@ai-matrx/overlays/styles\\.css$": "<rootDir>/test-utils/style-mock.ts",
    "^@ai-matrx/overlays/(.*)$": "<rootDir>/.overlays-src/$1.ts",
    ...(base.moduleNameMapper ?? {}),
  },
  cacheDirectory: "<rootDir>/.jest-scratch-cache",
};
export default config;
JEST
  # shellcheck disable=SC2086
  (cd "$W/$d" && node node_modules/jest/bin/jest.js -c jest.scratch.config.ts --no-watchman --ci --silent --no-coverage $JEST_PATHS > "$W/jest-$d.txt" 2>&1 || true)
  echo "jest $d: $(grep -E '^Test Suites:' "$W/jest-$d.txt")"
  grep -E '^FAIL' "$W/jest-$d.txt" | sort -u > "$W/jest-$d.fail" || true
done
echo "suites failing only in the switched tree:"
comm -13 "$W/jest-base.fail" "$W/jest-sw.fail" || true
