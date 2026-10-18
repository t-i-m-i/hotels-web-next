import { requireSessionUser } from "@/lib/getSession";
import { forbidden } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();
  if (!user.roles.includes("admin")) {
    forbidden();
  }
  return children;
}
