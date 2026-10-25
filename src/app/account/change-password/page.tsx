import { ChangePasswordFormView } from "@/components/auth/ChangePasswordFormView";
import { requireSessionUser } from "@/lib/getSession";

export default async function ChangePassword() {
  await requireSessionUser("/account/change-password");
  return <ChangePasswordFormView />;
}
