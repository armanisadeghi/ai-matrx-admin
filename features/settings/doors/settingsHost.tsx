// features/settings/doors/settingsHost.tsx
//
// THE APP'S SETTINGS HOST: what `@ai-matrx/design-system/settings` (SettingsRow, SettingsSection, the
// controls and the navigation) needs from this app, bound ONCE at module load.
//
// MOUNTED at the root: app/Providers.tsx renders <SettingsHost /> next to <SharingHost />, so every
// route that takes the app Providers has the host before the first settings row draws (the package's
// useNavigate port is a HOOK: it must be bound before first render or the hook count changes).
// A bare side-effect import is not a binding the bundler must keep ("sideEffects": false); the mount is.
// The guard providers/__tests__/root-hosts-are-bound.test.ts fails when a route group draws without it.
// The package names every port and its announcing default in its src/settings/host.tsx.

import { configureSettings } from "@ai-matrx/design-system/settings";
import { AppLink } from "@/components/navigation/AppLink";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { SettingAnchor } from "@/features/settings/doors/SettingAnchor";
import { useSettingsNavigate } from "@/features/settings/components/SettingsPresentationContext";

configureSettings({
  Link: AppLink,
  ErrorMenu: ErrorAlchemyMenu,
  Anchor: SettingAnchor,
  useNavigate: useSettingsNavigate,
  copyNotify,
});

/** Renders nothing; mounting it in app/Providers.tsx is what binds (and keeps) the host above. */
export function SettingsHost(): null {
  return null;
}
