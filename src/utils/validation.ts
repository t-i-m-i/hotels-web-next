import { z } from "zod";

/**
 * Matches the backend's `ParseUUIDPipe` (any RFC 4122 version), so a route
 * param that would 400 at the API is rejected here before any fetch happens.
 */
export const uuidSchema = z.uuid();

export const isUuid = (value: string): boolean =>
  uuidSchema.safeParse(value).success;
