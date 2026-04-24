"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("polymind-theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("polymind-theme", newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="nav-link"
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: "pointer",
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        color: "var(--text-secondary)",
        transition: "all 0.2s",
      }}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {mounted ? (
        theme === "dark" ? <Sun size={16} /> : <Moon size={16} />
      ) : (
        <div style={{ width: 16, height: 16 }} /> // Spacer during hydration
      )}
    </button>
  );
}
