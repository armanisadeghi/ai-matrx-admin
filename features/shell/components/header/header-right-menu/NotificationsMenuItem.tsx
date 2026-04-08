import { Bell } from "lucide-react";
import { MENU_ITEM_CLASS } from "./menuItemClass";

export function NotificationsMenuItem() {
  return (
    <label htmlFor="shell-user-menu" className={MENU_ITEM_CLASS}>
      <Bell />
      Notifications
    </label>
  );
}
