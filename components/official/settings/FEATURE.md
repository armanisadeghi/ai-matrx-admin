# Settings primitives

THE BLOCKS MOVED (2026-10-22): rows, sections, groups, controls and navigation now live in
`@ai-matrx/design-system/settings` (source: `aidream/apps/shared/design-system/src/settings/`; the rules for
using them: that folder's FEATURE.md). The app binds the package once in
`features/settings/doors/settingsHost.tsx` (`configureSettings`).

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/account/settings/FEATURE.md.

Only the app-coupled controls stay in this folder, each composing the package's `SettingsRow`:
`primitives/SettingsModelPicker` (Redux model catalog), `primitives/SettingsTextarea` and
`primitives/SettingsProTextarea` (ProTextarea), `primitives/SettingsTailwindColor` (the app's color picker).
Import every other block from `@ai-matrx/design-system/settings`.
