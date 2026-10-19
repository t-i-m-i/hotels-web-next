# 009 — Host bookings view on `/bookings`

Hosts can now see bookings for their hotels. The nav keeps a single
`/bookings` entry; the page picks the view from the active role.

## What changed

- `src/api/bookings.ts`: added `getByHost(hostId)` (`GET /bookings/host/{hostId}`)
  plus `HostHotelBookingsDto`, `HostBookingDto`, `UpdateBookingStatusDto` types
  (the last is unused until status updates are built).
- `src/app/bookings/page.tsx`: requires a session, reads the active role and
  renders `HostBookings` or `GuestBookings`.
- `src/components/guest/GuestBookings.tsx`: the previous guest list, moved out
  of the page unchanged (heading is now "Bookings").
- `src/components/host/{HostBookings,BookingsHotel,BookingsItem}.tsx`: bookings
  grouped by hotel.
- `src/lib/getSession.ts`: added `requireHost(redirectTo)` — session check plus
  `forbidden()` when the user lacks the `host` role.
- `.vscode/settings.json`: `typescript.preferences.importModuleSpecifier:
  "non-relative"` so editor auto-imports use `@/...`.

## Non-obvious

- **Why not redirect `/bookings` → `/host/bookings`?** First version did that.
  The page is dynamic (`cookies()`/`headers()`), so nothing is prefetched, and
  the redirect cost a second server round trip plus a second session call
  (`cache()` only dedupes within one render). Navigation showed a blank page
  for ~1s. Rendering by role in place removes the hop; no `loading.tsx` needed.
- **Layouts aren't a guard.** They don't re-render on sibling navigation, so
  `src/app/host/layout.tsx` was deleted. Every future `/host/*` page must call
  `requireHost("/host/...")` itself. `/bookings` doesn't need it: the role comes
  from `getActiveRole`, which only returns roles in `user.roles`, and the API
  calls are keyed by `user.id`.
- Empty `redirectTo` is fine: `redirectToSchema` falls back to `/`.
