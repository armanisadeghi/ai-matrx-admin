// AuthIsland.tsx — Server component for the auth button
// Immutable glass container: icon (left) + text (right)
// Pre-hydration: ({Icon} Login) — Hydrated: ({Avatar} UserName)

import Image from "next/image";
import ShellIcon from "./ShellIcon";

interface AuthIslandProps {
  user: {
    name: string;
    avatarUrl?: string;
  } | null;
}

export default function AuthIsland({ user }: AuthIslandProps) {
  if (user) {
    return (
      <a
        href="/settings"
        className="shell-auth-island shell-glass shell-tactile"
      >
        <span className="shell-auth-island-icon">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name}
              width={24}
              height={24}
              className="shell-auth-island-avatar"
            />
          ) : (
            <ShellIcon name="User" size={16} strokeWidth={2} />
          )}
        </span>
        <span>{user.name}</span>
      </a>
    );
  }

  return (
    <a
      href="/login"
      className="shell-auth-island shell-glass shell-tactile"
    >
      <span className="shell-auth-island-icon">
        <ShellIcon name="LogIn" size={16} strokeWidth={2} />
      </span>
      <span>Login</span>
    </a>
  );
}
