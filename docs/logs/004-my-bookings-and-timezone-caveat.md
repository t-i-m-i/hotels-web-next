# 004 — `/my-bookings` page, and the `isPastBooking` timezone caveat

## What we did

Replaced the `/user-bookings` stub (from `003-booking-flow.md`) with a real
`/my-bookings` page:

```
src/app/user-bookings/page.tsx    # deleted
src/app/my-bookings/page.tsx      # new — awaits getBookingsByUser(userId), renders BookingListItem list
src/components/BookingListItem.tsx  # new
src/api/bookings.ts               # + getBookingsByUser(userId)
```

`userId` is hardcoded for now — no auth in this app yet, same as every
other admin-ish route.

## The `isPastBooking` bug and fix

`BookingListItem` dims past bookings (`opacity-60`) based on an
`isPastBooking(checkOut)` check. First version:

```ts
function isPastBooking(checkOut: string): boolean {
  const now = new Date();
  return new Date(checkOut) < now;
}
```

This looks harmless — both sides are `Date` objects, so it looks like a
same-timezone comparison. It isn't. `checkOut` is a bare `"YYYY-MM-DD"`
calendar day (matches the backend's `date` columns, see
`hotels-api/docs/logs/004-date-formatting-considerations.md`), and per the
ECMAScript spec, `new Date("2026-09-01")` (date-only, no time component)
is parsed as **UTC midnight**, unconditionally — it does not use the
runtime's local timezone at all. `new Date()` with no arguments, by
contrast, gives the true current instant, which *does* reflect the
runtime's real clock/offset.

So the two operands are built asymmetrically: one is anchored to UTC no
matter where the code runs, the other is a genuine instant. On a server
in UTC-8, at real wall-clock time `2026-08-31 16:30` (still Aug 31,
checkout day hasn't even started), `now` converts to `2026-09-01T00:30Z`
— already past the UTC-anchored `2026-09-01T00:00Z` from `new
Date(checkOut)`. The booking reads as "past" 8 hours before its checkout
day even begins, purely because of which side of UTC midnight the
server's clock happens to sit on. This is the same "date-only value
forced through a UTC-instant code path" class of bug as the backend log,
just triggered by string parsing instead of `.toISOString()`.

Fix: never construct a `Date` from `checkOut` at all. Build "today" as a
`YYYY-MM-DD` string using local getters (`getFullYear`/`getMonth`/
`getDate`), and compare lexically — lexical order matches chronological
order for that format, and neither side ever crosses an instant/UTC
boundary:

```ts
function isPastBooking(checkOut: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return checkOut < today;
}
```

## Known remaining approximation: whose "today"?

The fix above removes the UTC/local parsing bug, but not a deeper
question: `isPastBooking` runs inside a Server Component, so `now` is
always the *server's* local clock — never the viewing browser's, and
never the hotel's. A guest in Warsaw viewing a booking for a hotel in
Tokyo, rendered by a server that happens to run in `UTC-8`, gets a
"today" that matches none of the three relevant timezones. Near a
midnight boundary this can flip the dimming either way depending on which
side of midnight the server's clock and the "true" reference frame
disagree on.

This is a deliberately accepted approximation for now, documented inline
at the `isPastBooking` definition in `BookingListItem.tsx`, because it
only affects a cosmetic dimming style, not any booking/cancellation
enforcement logic. But it's worth recording the general shape of the
problem, because it's exactly the kind of thing that looks like a
throwaway detail in a demo app but is a real, well-known problem in
production booking systems:

- A checkout day is not an instant — it's a calendar day **at the hotel**,
  not at the guest's location, not at whatever server happens to render
  the page. "Checkout Sept 1" means Sept 1 in Tokyo, full stop, regardless
  of where the guest or the server sits.
- Real booking/travel platforms model this by storing the property's IANA
  timezone (e.g. `"Asia/Tokyo"`, not a fixed UTC offset — offsets shift
  with DST, named zones encode the actual rule) alongside any
  policy that has a wall-clock component ("check-in from 3pm",
  "free cancellation until 24h before arrival").
- Any instant that actually needs computing (e.g. "has the free
  cancellation window closed?") gets derived at query time by combining
  the date-only value + the property-local time + the property's
  timezone into one real UTC instant, then compared against `now` (a
  genuine `timestamptz`). This is the same "date + local time + zone →
  instant" combination the backend log flags as the genuinely tricky
  case, and the exact pattern to reach for if this ever needs to be
  authoritative instead of cosmetic.
- Display to a viewer is a separate, final step — convert to whichever
  timezone is relevant to *them* only when rendering, never bake a
  viewer's or server's timezone into what's stored or compared.

We don't model hotel timezones yet (`Hotel`/`BookingDetailsDto` have no
timezone field), so this fix stops at "stop being wrong because of server
location," not "be correct relative to the hotel." If hotel IANA
timezones get added later, `isPastBooking` (and anything else that treats
`checkIn`/`checkOut` as "today" relative to wherever the code executes)
should be revisited to use the hotel's timezone instead of the server's.
