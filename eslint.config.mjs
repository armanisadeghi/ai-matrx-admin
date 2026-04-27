// ESLint flat config (ESLint v9+ / Next.js 16+).
// Replaces the legacy .eslintrc.json. `next lint` was removed in Next.js 16 —
// run lint via the ESLint CLI: `pnpm lint` (which now invokes `eslint .`).
//
// Faithful port of the previous .eslintrc.json. The `no-restricted-imports`
// guard around `features/window-panels/windows/**` is preserved to keep the
// window-panels bundle-splitting contract intact (see .claude/skills/window-panels/SKILL.md).

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import noBarrelFiles from 'eslint-plugin-no-barrel-files';

const windowPanelsImportRestriction = {
    patterns: [
        {
            group: [
                '@/features/window-panels/windows/*',
                '@/features/window-panels/windows/**/*',
            ],
            message:
                "Import window components only via the registry's componentImport (features/window-panels/registry/windowRegistry.ts). Direct imports break bundle splitting. See .claude/skills/window-panels/SKILL.md.",
        },
    ],
};

export default [
    ...nextCoreWebVitals,
    {
        plugins: {
            'no-barrel-files': noBarrelFiles,
        },
        rules: {
            'no-barrel-files/no-barrel-files': 'warn',
            'react-hooks/exhaustive-deps': 'off',
            '@next/next/no-img-element': 'off',
            'react/no-unescaped-entities': 'off',
            'import/no-anonymous-default-export': 'off',
            'no-restricted-imports': ['error', windowPanelsImportRestriction],
        },
    },
    {
        files: ['features/window-panels/windows/**/*'],
        rules: {
            'no-restricted-imports': 'off',
        },
    },
    {
        files: [
            'features/window-panels/registry/windowRegistry.ts',
            'features/window-panels/UnifiedOverlayController.tsx',
            'features/window-panels/OverlaySurface.tsx',
            'components/overlays/OverlayController.tsx',
        ],
        rules: {
            'no-restricted-imports': 'off',
        },
    },
];
