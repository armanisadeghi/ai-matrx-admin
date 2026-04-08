"use client";

import { useCallback, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { MENU_ITEM_CLASS } from "./menuItemClass";

export function ThemeToggleMenuItem() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const handleClick = useCallback(() => {
    const html = document.documentElement;
    const newDark = !html.classList.contains("dark");
    html.classList.toggle("dark", newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    document.cookie = `theme=${newDark ? "dark" : "light"};path=/;max-age=31536000`;
    setIsDark(newDark);
  }, []);

  return (
    <label htmlFor="shell-user-menu" className="block">
      <button className={MENU_ITEM_CLASS} onClick={handleClick}>
        {isDark ? <Sun /> : <Moon />}
        {isDark ? "Light Mode" : "Dark Mode"}
      </button>
    </label>
  );
}
