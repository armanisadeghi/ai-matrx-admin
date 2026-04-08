import HamburgerButton from "./header-left-menu/HamburgerButton";
import UserMenuTrigger from "./header-right-menu/UserMenuTrigger";
import UserMenuPanel from "./header-right-menu/UserMenuPanel";
import { UserData } from "@/utils/userDataMapper";

interface HeaderProps {
  userData: UserData;
}

export default function Header({ userData }: HeaderProps) {
  return (
    <header className="shell-header">
      <HamburgerButton />

      <div className="shell-header-center" id="shell-header-center" />

      <div className="shell-user-menu-wrapper">
        <UserMenuTrigger userData={userData} />
        <label
          htmlFor="shell-user-menu"
          className="shell-user-menu-backdrop"
          aria-hidden="true"
        />
        <div className="shell-user-menu-panel">
          <UserMenuPanel userData={userData} />
        </div>
      </div>
    </header>
  );
}
