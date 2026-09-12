import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean; }

export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props }: ButtonProps) {
  const variants = { primary: "bg-amber-300 text-slate-950 hover:bg-amber-200", secondary: "bg-cyan-300 text-slate-950 hover:bg-cyan-200", ghost: "border border-white/15 text-white hover:bg-white/10", danger: "bg-red-400 text-slate-950 hover:bg-red-300" };
  const sizes = { sm: "px-3 py-2 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-base" };
  return <button className={`rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>{loading ? "Cargando..." : children}</button>;
}