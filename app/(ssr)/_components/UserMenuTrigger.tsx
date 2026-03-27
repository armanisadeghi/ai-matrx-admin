"use client";

import Image from "next/image";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";

export default function UserMenuTrigger() {
  const reduxUser = useAppSelector(selectUser);

  const name = reduxUser?.userMetadata?.name || reduxUser?.email?.split("@")[0];
  const avatarUrl = reduxUser?.userMetadata?.avatarUrl;
  const isLoggedIn = !!reduxUser?.id;

  return (
    <label
      htmlFor="shell-user-menu"
      aria-label="User menu"
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 cursor-pointer outline-none"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full matrx-shell-glass transition-colors overflow-hidden">
        {isLoggedIn && avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name || "User"}
            width={32}
            height={32}
            className="w-full h-full object-cover"
            loading="eager"
            priority
          />
        ) : isLoggedIn && name ? (
          <span className="text-xs font-semibold text-foreground leading-none">
            {name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        )}
      </div>
    </label>
  );
}
