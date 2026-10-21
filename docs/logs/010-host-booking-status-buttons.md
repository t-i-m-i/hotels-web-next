# 010 — Host booking status buttons

Hosts can confirm, cancel or mark a booking as no-show from `/bookings`. The
buttons come from the API's new `allowedStatusChanges` field, so the app has
no role or date logic of its own (see `hotels-api` log 016).

## What changed

- `src/api/generated/schema.d.ts`: regenerated; `HostBookingDto` and
  `BookingDetailsDto` now carry `allowedStatusChanges`.
- `src/api/bookings.ts`: added `updateBookingStatus(id, body)`
  (`PATCH /bookings/{id}/status`), a `BookingStatus` type, and renamed
  `Booking` to `BookingDto` to match the schema name.
- `src/app/actions.ts`: `updateBookingStatusAction` wraps it as a Server Action.
- `src/components/common/BookingStatusButtons.tsx`: client component rendering
  one button per allowed, actionable status. `BookingsItem` stays a Server
  Component and just passes `allowedStatusChanges` down.

## Non-obvious

- **The action returns `{ error }` instead of throwing.** In production Next
  hides the message of a thrown Server Action error, so the client would never
  see the API's text (e.g. the 409 "Cannot change a 'x' booking to 'y'").
  `apiClient` calls `throw` the parsed Nest body, a plain object rather than an
  `Error`, so the action reads `e.message` defensively.
- **`revalidatePath("/bookings")` replaces `router.refresh()`.** Called in the
  action after a successful PATCH, Next returns the fresh page data in the same
  response, so there is one round trip instead of two. It is skipped on error.
- **Pending state:** `useTransition` stays pending until the revalidated page
  has rendered, so buttons remain disabled until the new status is on screen.
  `clicked` (state) says which button shows "Updating…"; it is only meaningful
  while `isPending`, so it is never reset.
- **Labels and classes live in an `ACTIONS` map keyed by status.** Tailwind only
  generates classes it finds as full strings in source, so the map beats
  building `bg-${status}` names. `satisfies Partial<Record<...>>` keeps keys
  typed, and `filter(isAction)` drops `pending`/`completed`, which the
  generated enum contains but are never actions.
- A stale list (e.g. across midnight) is harmless: the API still enforces the
  rules and returns 409, which is shown under the buttons.

