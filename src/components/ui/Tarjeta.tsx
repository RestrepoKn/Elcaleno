import type { HTMLAttributes } from "react";

export function Tarjeta({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-borde bg-superficie p-4 shadow-sm sm:p-5 ${className}`}
      {...props}
    />
  );
}
