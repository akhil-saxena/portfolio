"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as "light" | "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current || "light");
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="theme-toggle"
    >
      {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
    </button>
  );
}
