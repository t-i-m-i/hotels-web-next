"use client";

import { authClient, SessionUser } from "@/api/authClient";
import { clearActiveRole, setActiveRole } from "@/app/actions";
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
    <div>
      <div>
        <p>
          Viewing as:
          {user.roles.map((role) => (
            <button
              key={role}
              onClick={() => handleSwitchRole(role)}
              className={role === activeRole ? "font-bold" : ""}
            >
              {ROLE_LABELS[role] ?? role}
            </button>
          ))}
        </p>
      </div>
      <div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}
