"use client";

import { LogOut, Trash2, UserPlus } from "lucide-react";
import AppLink from "@/components/navigation/AppLink";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAnonymous } from "@/lib/redux/selectors/userSelectors";
import {
  useSignOut,
  reportSignOutFailure,
  runForgetGuestBrowserFlow,
} from "@/features/shell/auth/useSignOut";
import { MENU_ITEM_CLASS } from "./menuItemClass";
import { MenuItemCloseLabel } from "./menuCheckboxId";

/**
 * A GUEST (anonymous session) has no account to sign back into: instead of
 * Sign Out they get "Create free account" and "Forget this browser" (behind a
 * confirm that names what is lost). Unreachable until guest sessions exist.
 */
function GuestAccountMenuItems() {
  return (
    <>
      <MenuItemCloseLabel>
        <AppLink prefetch={false} href="/sign-up" className={MENU_ITEM_CLASS}>
          <UserPlus />
          Create free account
        </AppLink>
      </MenuItemCloseLabel>
      <MenuItemCloseLabel>
        <button
          className={cn(
            MENU_ITEM_CLASS,
            "text-destructive [&_svg]:text-destructive",
          )}
          onClick={() => runForgetGuestBrowserFlow().catch(reportSignOutFailure)}
        >
          <Trash2 />
          Forget this browser
        </button>
      </MenuItemCloseLabel>
    </>
  );
}

// The one sign-out primitive (device-scoped, super admins warned twice by
// name) lives in features/shell/auth/useSignOut.ts — never call
// the Supabase client's sign-out from a control directly.
export function SignOutMenuItem() {
  // This menu mounts only for a signed-in session, so the one question left is
  // guest vs member. Keyed on the anonymous flag itself (not `!hasAccount`) so
  // a member is never shown the guest rows while the store hydrates.
  const isGuest = useAppSelector(selectIsAnonymous);
  if (isGuest) return <GuestAccountMenuItems />;
  return <MemberSignOutMenuItem />;
}

function MemberSignOutMenuItem() {
  const signOut = useSignOut();

  return (
    <MenuItemCloseLabel>
      <button
        className={cn(
          MENU_ITEM_CLASS,
          "text-destructive [&_svg]:text-destructive",
        )}
        onClick={() => signOut().catch(reportSignOutFailure)}
      >
        <LogOut />
        Sign Out
      </button>
    </MenuItemCloseLabel>
  );
}
