import { AccountActions } from "@/components/auth/AccountActions";
import { getActiveRole, requireSessionUser } from "@/lib/getSession";

export default async function AccountPage() {
  const user = await requireSessionUser("/account");
  const activeRole = await getActiveRole(user);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4 pt-12">
      <h1 className="text-2xl font-bold">Account</h1>

      <dl className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <dt className="text-sm text-neutral-500">Name</dt>
          <dd className="font-semibold">{user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-500">Email</dt>
          <dd className="font-semibold">{user.email}</dd>
        </div>
      </dl>

      <AccountActions user={user} activeRole={activeRole} />
    </div>
  );
}
