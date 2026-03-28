import HamburgerButton from "./HamburgerButton";
import UserMenuTrigger from "./UserMenuTrigger";
import UserMenuPanel from "./UserMenuPanel";

interface HeaderProps {
  avatarUrl?: string;
  name?: string;
}

export default function Header({ avatarUrl, name }: HeaderProps) {
  return (
    <header className="shell-header">
      <HamburgerButton />

      <div className="shell-header-center" id="shell-header-center" />

      <div className="shell-user-menu-wrapper">
        <UserMenuTrigger initialAvatarUrl={avatarUrl} initialName={name} />
        <label htmlFor="shell-user-menu" className="shell-user-menu-backdrop" aria-hidden="true" />
        <div className="shell-user-menu-panel">
          <UserMenuPanel />
        </div>
      </div>
    </header>
  );
}
