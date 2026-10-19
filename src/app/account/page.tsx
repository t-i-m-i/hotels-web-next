import { AccountActions } from "@/components/auth/AccountActions";
import { getActiveRole, requireSessionUser } from "@/lib/getSession";

export default async function AccountPage() {
  const user = await requireSessionUser("/account");
  const activeRole = await getActiveRole(user);

  return (
    <div>
      <h1>Account</h1>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>

      <AccountActions user={user} activeRole={activeRole} />
    </div>
  );
}
