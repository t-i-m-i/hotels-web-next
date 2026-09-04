import { test, expect } from "@playwright/test";
import { addMonths, format, setDate } from "date-fns";

// Browser counterpart to the RN app's Maestro flow at
// ../hotels/.maestro/booking-flow.yaml: search seeded data for a hotel,
// pick a date range on the calendar, reserve, land on the confirmation
// page. Same seed data (shared Postgres instance), same search term, same
// check-in/check-out days, so the two suites stay easy to compare.
//
// Requires hotels-api running locally at HOTELS_API_URL with the demo seed
// data (see hotels-api's README) — this suite only starts the Next.js
// server itself (see playwright.config.ts).
//
// This flow creates a real booking against the shared Postgres instance.
// We delete it in afterEach via the API's own DELETE /bookings/:id rather
// than a separate cleanup script — the id is only known once the booking
// exists, and the backend already exposes the endpoint to remove it.
const apiUrl = process.env.HOTELS_API_URL ?? "http://localhost:3000";

test.describe("books a hotel end to end", () => {
  let createdBookingId: string | undefined;

  test.afterEach(async ({ request }) => {
    if (createdBookingId) {
      await request.delete(`${apiUrl}/bookings/${createdBookingId}`);
      createdBookingId = undefined;
    }
  });

  test("books a hotel end to end", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Search").fill("Barcelona");

    const hotelLink = page.locator('a[href^="/hotel/"]').first();
    await expect(hotelLink).toBeVisible();
    await hotelLink.click();

    await expect(page.getByRole("button", { name: "Reserve" })).toBeVisible();

    // Next month, days 10-13 — same range the Maestro flow books, far
    // enough out that it's very unlikely to collide with another booking
    // already on the shared demo hotel.
    const nextMonth = addMonths(new Date(), 1);
    const checkIn = setDate(nextMonth, 10);
    const checkOut = setDate(nextMonth, 13);

    await page.getByRole("button", { name: "Go to the Next Month" }).click();
    await page.getByRole("button", { name: format(checkIn, "PPPP") }).click();
    await page.getByRole("button", { name: format(checkOut, "PPPP") }).click();

    await page.getByRole("button", { name: "Reserve" }).click();

    await expect(page).toHaveURL(/\/booking\/([0-9a-f-]+)$/);
    createdBookingId = new URL(page.url()).pathname.split("/").pop();

    await expect(page.getByRole("heading", { name: "Booking Details" })).toBeVisible();
  });
});
