import createClient from "openapi-fetch";
import type { paths } from "@/api/generated/schema";
import { headers } from "next/headers";

const baseUrl = process.env.HOTELS_API_URL;

if (!baseUrl) {
  throw new Error("HOTELS_API_URL is not set — check your .env.local");
}

export const apiClient = createClient<paths>({ baseUrl });

apiClient.use({
  async onRequest({ request }) {
    // headers() marks a page as dynamic, so every page that calls apiClient is now rendered per request, including the public hotel list and detail pages. That's fine at this size, but you've lost any static or cached rendering there. If you later want public pages cached, you'd need a separate unauthenticated client for them.
    request.headers.set("cookie", (await headers()).get("cookie") ?? "");

    // Set only in playwright.config.ts's webServer.env — never by a developer's
    // own `bun run dev`. Tags every booking this server creates as synthetic
    // (hotels-api's `X-Synthetic-Booking` header) so a crashed test run's
    // leftover booking is still identifiable/sweepable via
    // `DELETE /bookings/synthetic`, on top of e2e/booking-flow.spec.ts's own
    // precise per-test cleanup by id.
    if (process.env.E2E_TEST_MODE === "true") {
      request.headers.set("X-Synthetic-Booking", "true");
    }
    return request;
  },
});
