# 011 — HotelForm on react-hook-form + Zod

The booking form on the hotel page now uses react-hook-form with a Zod schema,
like `LoginFormView`, and has real guest inputs instead of hardcoded
`test@test.com` / John Doe values.

## What changed

- `src/schemas/booking.ts` (new): `createBookingSchema` (dates required,
  `checkOut > checkIn` refine, `z.email()`, non-empty names) and the
  `BookingForm` type via `z.infer`.
- `src/components/HotelForm.tsx`: `useForm` + `zodResolver`; guest email, first
  and last name inputs registered; `serverError` as local state (same shape as
  `LoginFormView`); button disabled by `isSubmitting`. `useTransition`,
  `isPending` and the manual `body` object are gone.
- `src/app/actions.ts`: `submitBooking(body: unknown)` now runs
  `createBookingSchema.safeParse` before calling the API.
- `docs/guides/server-action-input-validation.md`: the general rule behind the
  `unknown` param (see below).

## Non-obvious

- **No `useTransition` needed.** `handleSubmit` keeps `isSubmitting` true until
  the promise from `onBook` settles, and a Server Action is just an async
  function, so `await submitBooking(data)` is enough. Wrapping it in
  `startTransition(async () => ...)` would make `onBook` resolve immediately
  (`startTransition` doesn't return the inner promise) and `isSubmitting` would
  flip back while the request is still running.
- **The date range is not a registered field.** `DatePicker` keeps its own
  `range` state for display; its `onSelectAction` also calls `setValue` for
  `checkIn` / `checkOut` (formatted `yyyy-MM-dd`, `shouldValidate: true`), so
  the form values and Zod errors follow the picker. `format` lives there, not
  in `onBook`.
- **`isSubmitting` ends before navigation does.** After the action resolves,
  `router.push` is still loading the next page, so the button can re-enable
  briefly. Wrap the push in `startTransition` and also check `isPending` if
  that becomes a problem.
- **Server-side parse, because actions are public endpoints.** Client-side Zod
  guards nothing. The parse in `submitBooking` is a cheap early gate; the real
  checks are on the API.
- **API-side gaps noticed while reviewing** (`hotels-api`, no change made):
  `create()` doesn't check the hotel exists. The FK on `bookings.hotel_id`
  keeps the data safe, but an unknown id surfaces as a raw 500 rather than a
  404. Also, the overlap check and the `INSERT` are separate statements, so two
  simultaneous requests could both pass; an exclusion constraint would close
  it. Both matter more once payments exist.
- **Pricing note for later:** price must be computed on the server from the
  stored dates when the booking is created, and payments must read it from the
  database, never from the client request.
