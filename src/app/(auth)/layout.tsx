import { getSessionUser } from "@/lib/getSession";
import { redirect } from "next/navigation";

// Shared by login, register, reset, ... — a signed-in user has no business on
// any of them. This is a UX redirect, not access control: layouts don't
// re-render on client-side navigation within the group, and they can't read
// searchParams, so the ?redirectTo= target is dropped and we land on "/".
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getSessionUser()) {
    redirect("/");
  }
  return children;
}
