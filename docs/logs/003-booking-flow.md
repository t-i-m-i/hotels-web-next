# 003 — End-to-end booking flow: form, submit, confirmation, disabled days

## What we did

Built the first write path in this app — until now every page only ever
`await`ed a `GET`. Added:

```
src/components/DatePicker.tsx  # controlled range picker (range/onSelectAction props), now also accepts `disabled`
src/components/HotelForm.tsx   # 'use client' — owns range state, builds CreateBookingDto, submits, redirects
src/api/bookings.ts            # submitBooking, getBooking, getBookings, getCurrentByHotel — all "use server"
src/app/hotel/[hotelId]/page.tsx  # now Promise.all's getHotels() + getCurrentByHotel(hotelId)
src/app/booking/[bookingId]/page.tsx  # confirmation route (was a bare stub before today)
src/app/bookings/page.tsx      # admin-ish "all bookings" list (BookingDetailsDto, with hotel/guest names)
src/app/hotels/page.tsx        # stub, placeholder for a future admin hotels view
src/app/user-bookings/page.tsx # stub, placeholder for a future "bookings grouped by user" view
```

Removed `src/app/my-bookings/page.tsx` and repurposed `NavBar` around a
new split: **Explore / Map / Last Minute** as customer-facing routes,
**Hotels / Bookings / Users with bookings** as future-admin routes (no
auth yet, so unprotected for now) meant for practicing SQL/reporting
queries rather than mimicking a real booking platform's customer-facing
"my bookings" screen.

## This is a deliberate departure from RN parity, not drift

`AGENTS.md` says to keep this app's stub routes in sync with the RN app's
and not get ahead of it "without discussing it first." Deleting
`my-bookings` and replacing that nav slot with admin-oriented routes is
exactly that kind of departure — done knowingly, because this app's
purpose here has shifted toward being a query/reporting playground on top
of the same data, not a strict RN port. Recording that decision here so
`AGENTS.md`'s current wording doesn't read as silently violated by future
readers (including future us) — `AGENTS.md` itself should probably get a
line added/updated to reflect this, separately from this log entry.

## No client-side data-fetching layer for the write path either

`submitBooking` (`src/api/bookings.ts`) is a Server Action (`"use
server"`), called directly from `HotelForm`'s `onSubmit` handler — not
wired through `<form action={...}>`, because the submitted data
(`hotelId`, `checkIn`/`checkOut` derived from React state) isn't shaped
like native `FormData`. This is the mutation-side equivalent of the
existing "Server Components fetch directly, no TanStack Query" rule for
reads: no `useMutation`, just an `async` function that happens to run on
the server, called like any other async call from a client component.

## Gotchas hit along the way

- **`React.FormEvent` is deprecated in this React version, not a
  mistake.** Checked `node_modules/@types/react/index.d.ts:2087-2088`
  directly — `FormEvent` carries `@deprecated FormEvent doesn't actually
  exist`, pointing at `SubmitEvent` instead. `React.SubmitEvent<
  HTMLFormElement>` is the correct type for `onSubmit` here; assumed this
  was a bug from prior React-version knowledge before actually checking
  the installed types, which is exactly the kind of thing `AGENTS.md`
  warns this repo's dependencies won't match training data on.
- **`next/router`'s default-export `router` singleton doesn't exist under
  App Router.** Caused a runtime `"No router instance found"` — the fix is
  `useRouter()` from `next/navigation` (a hook, called at component top
  level), a different package with a different shape, not just a renamed
  import.
- **`react-day-picker`'s `disabled` prop wants `Date` objects, not ISO
  strings.** `DateRange`-as-`Matcher` is `{ from: Date; to: Date }`
  (confirmed in `node_modules/react-day-picker/dist/esm/types/shared.d.ts`)
  — booking data comes back from the API as `checkIn`/`checkOut` strings
  (matches the backend's `@IsDateString()` DTO fields), so `HotelForm`
  converts with `new Date(b.checkIn)`/`new Date(b.checkOut)` before
  passing to `DatePicker`'s new `disabled` prop.
- **`GET /bookings/hotel/:hotelId` is fetched concurrently with
  `getHotels()`**, not sequentially, via `Promise.all` in
  `hotel/[hotelId]/page.tsx` — deliberately avoided extending
  `HotelsService.findOne` with a `reservations` join on the backend (would
  couple `HotelsModule` to booking schema/freshness requirements it
  doesn't need for every caller); `Promise.all` gets the same "one round
  trip from the browser's perspective" benefit without that coupling.

## Known gaps, deliberately not done yet

- No client-side validation on the date range beyond what `disabled`
  already prevents picking (past dates, already-booked ranges) — no
  explicit "checkout > checkin" or "checkin ≥ today" messaging if
  something slips through.
- `src/app/booking/[bookingId]/page.tsx` fetches the booking but doesn't
  render any of its fields yet beyond the raw id — confirmation UI is a
  placeholder.
- `/hotels`, `/user-bookings` are empty stubs with no real query behind
  them yet.
- No error/loading UI on the new `/bookings` list page (unlike `/`, which
  wraps `getHotels()` in a try/catch) — a failed fetch there will just
  throw to the nearest error boundary.

## Verification

Ran a full manual pass against both dev servers (`hotels-api` on `:3000`,
this app on `:3001`): picked a date range on a hotel page, submitted,
confirmed a row landed in `reservations` (via the backend's own log line
`POST /hotel/... submitBooking(...) 200`), confirmed the redirect to
`/booking/:id` fired, then reloaded the same hotel page and confirmed the
just-booked range showed as disabled in the picker (proving
`getCurrentByHotel` → `disabled` prop round-trips correctly end to end).
Also ran `bunx tsc --noEmit` clean on both repos after the session.
