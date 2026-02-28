// Header.tsx — Server component for the transparent header
// Completely transparent container — glass applies ONLY to child nodes
// Left: reserved (hamburger on mobile) | Center: injection zone | Right: Auth Island

import AuthIsland from "./AuthIsland";

interface HeaderProps {
  user: {
    name: string;
    avatarUrl?: string;
  } | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="shell-header">
      {/* Left — Mobile hamburger trigger (hidden on desktop via CSS) */}
      <div className="shell-mobile-trigger">
        <label
          htmlFor="shell-mobile-menu"
          className="shell-glass shell-tactile"
          aria-label="Open navigation menu"
          style={{ borderRadius: "9999px", padding: "0.375rem", display: "flex" }}
        >
          <div className="shell-hamburger">
            <span className="shell-hamburger-line" />
            <span className="shell-hamburger-line" />
            <span className="shell-hamburger-line" />
          </div>
        </label>
      </div>

      {/* Center — Dynamic injection zone for route-specific content */}
      <div className="shell-header-center" id="shell-header-center">
        {/* Intentionally empty at shell level. Route pages inject here. */}
      </div>

      {/* Right — Auth Island */}
      <AuthIsland user={user} />
    </header>
  );
}
