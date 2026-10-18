import { RegisterFormView } from "@/components/auth/RegisterFormView";
import { redirectToSchema } from "@/schemas/auth";

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const { redirectTo } = await searchParams;
  return <RegisterFormView redirectTo={redirectToSchema.parse(redirectTo)} />;
}
