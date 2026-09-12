"use client";
import { useTheme } from "./ThemeProvider";
export function ThemeToggle() { const { theme, toggle } = useTheme(); return <button type="button" onClick={toggle} className="rounded-md border border-white/15 px-3 py-2 text-xs text-white/75 hover:bg-white/10" aria-label="Cambiar tema">{theme === "dark" ? "Claro" : "Oscuro"}</button>; }