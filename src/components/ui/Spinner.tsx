export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return <span className={`inline-block animate-spin rounded-full border-2 border-borde border-t-primario ${sizes[size]}`} role="status" aria-label="Cargando" />;
}
