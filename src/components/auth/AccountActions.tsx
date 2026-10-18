"use client";

import { authClient, SessionUser } from "@/api/authClient";
import { useRouter } from "next/navigation";

export function AccountActions({ user }: { user: SessionUser }) {
  // console.log(user);
  const router = useRouter();
  const handleLogout = async () => {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <div>
      <div>
        <p>
          Viewing as:
          {user.roles.map((role) => (
            <span key={role}>{role}</span>
          ))}
        </p>
      </div>
      <div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}
