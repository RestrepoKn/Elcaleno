import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-fondo">
      <Spinner size="lg" />
    </main>
  );
}
