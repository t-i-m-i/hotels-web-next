"use client";

import { authClient, SessionUser } from "@/api/authClient";
import { clearActiveRole, setActiveRole } from "@/app/actions";
import { buttonClass } from "@/components/auth/styles";
import { useRouter } from "next/navigation";

const ROLE_HOME: Record<string, string> = {
  admin: "/account",
  host: "/bookings",
  guest: "/",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  host: "Host",
  guest: "Guest",
};

export function AccountActions({
  user,
  activeRole,
}: {
  user: SessionUser;
  activeRole: string;
}) {
  const router = useRouter();
  const handleLogout = async () => {
    // 1. first clear active role 2. then sign out
    // - clearActiveRole is a Server Action that deletes a cookie, so Next re-renders the current page (/account) after it,
    // so we want to be still logged in, otherwise requireSessionUser would try to redirect to (/login?redirectTo=/account),
    // which can race with router.replace("/") after signOut below.
    await clearActiveRole();
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };

  const handleSwitchRole = async (role: string) => {
    await setActiveRole(role);
    router.replace(ROLE_HOME[role]);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-neutral-500">Viewing as</p>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <button
              key={role}
              onClick={() => handleSwitchRole(role)}
              aria-pressed={role === activeRole}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                role === activeRole
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              }`}
            >
              {ROLE_LABELS[role] ?? role}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleLogout}
        className={`${buttonClass} border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900`}
      >
        Logout
      </button>
    </div>
  );
}
