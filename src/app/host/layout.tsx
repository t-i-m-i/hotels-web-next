import { requireSessionUser } from "@/lib/getSession";
import { forbidden } from "next/navigation";

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();
  if (!user.roles.includes("host")) {
    forbidden();
  }
  return children;
}
