import createClient from "openapi-fetch";
import type { paths } from "@/api/generated/schema";

const baseUrl = process.env.HOTELS_API_URL;

if (!baseUrl) {
  throw new Error("HOTELS_API_URL is not set — check your .env.local");
}

export const apiClient = createClient<paths>({ baseUrl });

// Set only in playwright.config.ts's webServer.env — never by a developer's
// own `bun run dev`. Tags every booking this server creates as synthetic
// (hotels-api's `X-Synthetic-Booking` header) so a crashed test run's
// leftover booking is still identifiable/sweepable via
// `DELETE /bookings/synthetic`, on top of e2e/booking-flow.spec.ts's own
// precise per-test cleanup by id.
if (process.env.E2E_TEST_MODE === "true") {
  apiClient.use({
    onRequest({ request }) {
      request.headers.set("X-Synthetic-Booking", "true");
      return request;
    },
  });
}
