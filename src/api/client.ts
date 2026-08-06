import createClient from "openapi-fetch";
import type { paths } from "@/api/generated/schema";

const baseUrl = process.env.HOTELS_API_URL;

if (!baseUrl) {
  throw new Error("HOTELS_API_URL is not set — check your .env.local");
}

export const apiClient = createClient<paths>({ baseUrl });
