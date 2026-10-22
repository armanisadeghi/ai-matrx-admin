// features/settings/doors/settingsHost.tsx
//
// THE APP'S SETTINGS HOST: what `@ai-matrx/design-system/settings` (SettingsRow, SettingsSection, the
// controls and the navigation) needs from this app, bound ONCE at module load. Imported for side effect
// by providers/chatUiRegistrationBase.ts (the shell's eager graph) and, lazily, by any test that draws a
// settings block. The package names every port and its announcing default in its src/settings/host.tsx.

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
