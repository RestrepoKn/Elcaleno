import type { HTMLAttributes } from "react";

export function Badge({ variant = "info", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: "info" | "success" | "warning" | "error" }) {
  const colors = { info: "bg-cyan-300/15 text-cyan-200", success: "bg-emerald-300/15 text-emerald-200", warning: "bg-amber-300/15 text-amber-200", error: "bg-red-300/15 text-red-200" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[variant]} ${className}`} {...props} />;
}