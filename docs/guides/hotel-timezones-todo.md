# TODO: per-hotel timezones - audit of "today" across all 3 projects

Status (2026-10-22): **deliberately deferred.** Hotels have no timezone in the
DB, so every "today" is computed from whatever clock runs the code. Decision:
stay with that for now (WIP project), and avoid UTC-derived days. When hotel
timezones are added, do the audit below in all three repos in one pass.

Rule that stays true afterwards: `check_in` / `check_out` are plain dates (a
calendar day at the hotel, no instant). Only "today" needs a timezone, and it
must be the hotel's, not the server's, device's, or viewer's.

## Where "today" comes from now

| Repo | Where | Source of "today" |
| --- | --- | --- |
| hotels-api | `bookings.service.ts` (`assertCheckInNotInPast`, status-change calls at ~L90/257/322 via `formatDateOnly(new Date())`) | Node process local TZ |
| hotels-api | `booking-status-transitions.ts` (`... check_out < CURRENT_DATE`), `bookings.service.ts` ~L192 (`check_out >= CURRENT_DATE`) | Postgres **session** TZ |
| hotels (RN) | `utils/bookingPhase.ts`, `HotelBookingSheet.tsx` (`minDate`) via `getLocalDateString` in `utils/dateRange.ts` | the **device's** TZ |
| hotels-web-next | `utils/date.ts` (`getLocalDateString`, `isTodayInRange`) used by `host/BookingsItem.tsx` | Next **server** local TZ |
| hotels-web-next | `BookingListItem.tsx` `isPastBooking` (duplicate of `getLocalDateString`) | Next server local TZ |

## Known inconsistencies today (not bugs while everything runs in one TZ)

- hotels-api uses two different clocks: Node local TZ (JS) and Postgres
  session TZ (`CURRENT_DATE`). They can disagree if the DB session isn't in the
  same TZ as the Node process (e.g. UTC DB, Warsaw dev machine).
- RN uses the device TZ, web the server TZ, API the process/DB TZ, so the same
  booking can read "staying now" in one place and not in another near midnight.
- The "status buttons" the API returns (`allowedStatusChanges`, computed with
  the API's `today`) and the "staying now" badge (web's `today`) can disagree
  on the boundary day.
- `HotelForm.tsx` builds `new Date(b.checkIn)` for the calendar's booked
  ranges: date-only strings parse as UTC midnight. Calendar-only, but the same
  class of bug as in hotels/docs/logs/003 - check it in the audit.
- The API data-model diagram already has `hotels.timezone` (IANA, default
  `'UTC'`) in `docs/diagrams/pricing-and-rooms-data-model.dbml`; the column
  doesn't exist in the real schema yet.

## Plan, once `hotels.timezone` exists

1. **hotels-api**: add the column + migration; expose `timezone` on the hotel
   and booking DTOs (regenerate OpenAPI). Replace `formatDateOnly(new Date())`
   and `CURRENT_DATE` with "today in the hotel's TZ", e.g. SQL
   `(now() AT TIME ZONE h.timezone)::date` (join hotels), or a single helper in
   JS using `Intl.DateTimeFormat('en-CA', { timeZone })`. Pick **one** approach
   so JS and SQL can't diverge. Cover `assertCheckInNotInPast`,
   `getAllowedStatusChanges`, the completed-status CASE, and the
   `check_out >= CURRENT_DATE` listing filter.
2. **hotels-web-next**: `getLocalDateString(date, timeZone)` takes the hotel's
   TZ; `isTodayInRange` / `isPastBooking` get it from the booking DTO. Stays a
   Server Component (no client flicker / hydration mismatch). Delete the
   duplicated date formatting in `BookingListItem.tsx`.
3. **hotels (RN)**: `bookingPhase.ts` uses the hotel's TZ instead of the
   device's. `HotelBookingSheet` `minDate` should be today at the hotel, not on
   the device (a guest in Warsaw booking Tokyo).
4. Re-run the tests around midnight boundaries (hotel TZ ahead of / behind the
   server TZ).

## Decided: turnover day stays as it is

The API treats `check_out` as exclusive for overlap, so a new guest may check
in on the previous guest's check-out day. "Staying now" is inclusive of
check-out day, so the host sees two active cards that day. That's accurate:
the first guest is there until roughly 10:00, the next from roughly 14:00. No
change needed.
