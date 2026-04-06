// HamburgerIsland — Mobile nav toggle using IconButton.
// Renders as a <label> that toggles the #shell-mobile-menu checkbox.
// CSS :has() drives the side-sheet open/close — zero JS.

import IconButton from "../IconButton";
import { Menu } from "lucide-react";

export default function HamburgerIsland() {
  return (
    <IconButton
      icon={<Menu strokeWidth={1.75} />}
      asLabel
      htmlFor="shell-mobile-menu"
      label="Open navigation menu"
    />
  );
}
