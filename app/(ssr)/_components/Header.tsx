import HamburgerButton from "./HamburgerButton";
import UserMenuTrigger from "./UserMenuTrigger";
import UserMenuPanel from "./UserMenuPanel";

export default function Header() {
  return (
    <header className="shell-header">
      <HamburgerButton />

      <div className="shell-header-center" id="shell-header-center" />

      <div className="shell-user-menu-wrapper">
        <UserMenuTrigger />
        <label htmlFor="shell-user-menu" className="shell-user-menu-backdrop" aria-hidden="true" />
        <div className="shell-user-menu-panel">
          <UserMenuPanel />
        </div>
      </div>
    </header>
  );
}
