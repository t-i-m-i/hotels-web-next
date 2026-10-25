"use client";

import { authClient } from "@/api/authClient";
import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "loading" | "password" | "external" | "error";

const mutedClass = "font-semibold text-neutral-500";

function renderContent(status: Status) {
  switch (status) {
    case "loading":
      return <p className={mutedClass}>Loading...</p>;
    case "password":
      return (
        <Link
          href="/account/change-password"
          className="font-semibold text-blue-600 hover:underline"
        >
          Change password
        </Link>
      );
    case "external":
      return (
        <p className={mutedClass}>
          You are logged in with an external provider.
        </p>
      );
    case "error":
      return <p className={mutedClass}>Couldn&lsquo;t load sign-in methods.</p>;
  }
}

export function ChangePasswordLink() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const check = async () => {
      const { data: accounts, error } = await authClient.listAccounts();
      if (error) return setStatus("error");
      setStatus(
        accounts?.some((a) => a.providerId === "credential")
          ? "password"
          : "external",
      );
    };

    check();
  }, []);

  return (
    <div>
      <dt className="text-sm text-neutral-500">Password</dt>
      <dd>{renderContent(status)}</dd>
    </div>
  );
}
