import Image from "next/image";
import { UserData } from "@/utils/userDataMapper";

interface UserMenuTriggerProps {
  userData: UserData;
}

export default function UserMenuTrigger({ userData }: UserMenuTriggerProps) {
  return (
    <label
      htmlFor="shell-user-menu"
      aria-label="User menu"
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 cursor-pointer outline-none"
    >
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full shell-glass transition-colors overflow-hidden">
        {userData?.userMetadata?.avatarUrl ? (
          <Image
            src={userData?.userMetadata.avatarUrl}
            alt={userData?.userMetadata.name || "User"}
            fill
            className="object-cover"
            sizes="32px"
            loading="eager"
            priority
          />
        ) : userData?.userMetadata.name ? (
          <span className="text-xs font-semibold text-foreground leading-none">
            {userData?.userMetadata.name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <svg
            className="w-4 h-4 text-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
            />
          </svg>
        )}
      </div>
    </label>
  );
}
