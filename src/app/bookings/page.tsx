import { GuestBookings } from "@/components/guest/GuestBookings";
import { HostBookings } from "@/components/host/HostBookings";
import { getActiveRole, requireSessionUser } from "@/lib/getSession";

export default async function BookingsPage() {
  const user = await requireSessionUser("/bookings");
  const activeRole = await getActiveRole(user);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {activeRole === "host" ? (
        <HostBookings userId={user.id} />
      ) : (
        <GuestBookings userId={user.id} />
      )}
    </div>
  );
}
