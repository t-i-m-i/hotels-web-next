import { GuestBookings } from "@/components/guest/GuestBookings";
import { HostBookings } from "@/components/host/HostBookings";
import { getActiveRole, requireSessionUser } from "@/lib/getSession";

export default async function BookingsPage() {
  const user = await requireSessionUser("/bookings");
  const activeRole = await getActiveRole(user);

  return activeRole === "host" ? (
    <HostBookings userId={user.id} />
  ) : (
    <GuestBookings userId={user.id} />
  );
}
