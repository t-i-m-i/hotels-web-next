// TODO(hotel timezones): "today" here is the clock of whoever runs this - on
// the web that's the Next server's local timezone. Hotels have no timezone in
// the DB yet; when they do, "today" must be computed in the hotel's timezone
// in all 3 projects (hotels-api, hotels RN, hotels-web-next).
// See docs/guides/hotel-timezones-todo.md.
// Local calendar day as "YYYY-MM-DD", via local Date getters - never
// toISOString(), which renders the UTC day and can be off by one depending
// on the device's offset from UTC
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// compare strings in YYYY-MM-DD format against local day string - no new Date(...) which would parse as UTC and can shift the day
export function isTodayInRange(checkIn: string, checkOut: string): boolean {
  const today = getLocalDateString();
  return today >= checkIn && today <= checkOut;
}
