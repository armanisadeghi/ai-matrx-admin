// Header.tsx — Server component for the transparent header
// Completely transparent container — glass applies ONLY to child nodes
// Left: reserved (hamburger on mobile) | Center: injection zone | Right: User Menu

import UserMenuIsland from "./UserMenuIsland";

interface HeaderProps {
  user: {
    name: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  isAdmin: boolean;
}

export default function Header({ user, isAdmin }: HeaderProps) {
  return (
    <header className="shell-header">
      {/* Left — Mobile hamburger trigger (hidden on desktop via CSS) */}
      <div className="shell-mobile-trigger">
        <label
          htmlFor="shell-mobile-menu"
          className="shell-mobile-menu-label"
          aria-label="Open navigation menu"
        >
          <div className="shell-hamburger shell-glass shell-tactile">
            <span className="shell-hamburger-line" />
            <span className="shell-hamburger-line" />
            <span className="shell-hamburger-line" />
          </div>
        </label>
      </div>

      {/* Center — Dynamic injection zone for route-specific content */}
      <div className="shell-header-center" id="shell-header-center">
        {/* Intentionally empty at shell level. Route pages inject here via portal. */}
      </div>

      {/* Right — User Menu (hamburger + avatar trigger, lazy dropdown) */}
      <UserMenuIsland user={user} isAdmin={isAdmin} />
    </header>
  );
}
