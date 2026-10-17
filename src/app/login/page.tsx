import { LoginPage } from "@/components/auth/LoginPage";

type LoginRouteProps = {
  searchParams: Promise<{ restablecida?: string }>;
};

export default async function LoginRoute({ searchParams }: LoginRouteProps) {
  const { restablecida } = await searchParams;
  return <LoginPage passwordRestablecida={restablecida === "1"} />;
}