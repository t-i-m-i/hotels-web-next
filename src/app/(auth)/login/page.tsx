import { LoginFormView } from "@/components/auth/LoginFormView";
import { redirectToSchema } from "@/schemas/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { redirectTo } = await searchParams;
  return <LoginFormView redirectTo={redirectToSchema.parse(redirectTo)} />;
}
