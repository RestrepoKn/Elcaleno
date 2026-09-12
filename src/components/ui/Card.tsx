import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`border border-white/10 bg-white/[0.04] p-5 ${className}`} {...props} />; }