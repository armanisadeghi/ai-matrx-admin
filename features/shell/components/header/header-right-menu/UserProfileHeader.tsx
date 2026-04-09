import Link from "next/link";
import Image from "next/image";
import { UserData } from "@/utils/userDataMapper";

interface UserProfileHeaderProps {
  userData: UserData;
}

export function UserProfileHeader({ userData }: UserProfileHeaderProps) {
  return (
    <label htmlFor="shell-user-menu" className="block">
      <Link
        href="/ssr/settings"
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--shell-glass-bg-hover)] transition-colors"
      >
        {userData.userMetadata.avatarUrl ? (
          <span className="relative block h-7 w-7 shrink-0 overflow-hidden rounded-full">
            <Image
              src={userData.userMetadata.avatarUrl}
              alt={userData.userMetadata.name}
              fill
              className="object-cover"
              sizes="28px"
              loading="eager"
              priority
            />
          </span>
        ) : (
          <span className="w-7 h-7 rounded-full bg-[var(--shell-glass-bg-active)] flex items-center justify-center text-xs font-semibold text-[var(--shell-nav-text)] shrink-0">
            {userData.userMetadata.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="flex flex-col min-w-0">
          <span className="text-base font-medium text-foreground truncate">
            {userData.userMetadata.name}
          </span>
          {userData.email && (
            <span className="text-xs text-foreground truncate">
              {userData.email}
            </span>
          )}
        </span>
      </Link>
    </label>
  );
}
