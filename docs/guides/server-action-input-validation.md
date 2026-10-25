# Server Actions: typed params are a promise, not a guarantee

Every export of `src/app/actions.ts` is a public HTTP endpoint (see
`next-and-server-components.md`). TypeScript types are erased at runtime, so
`id: string` in a signature guarantees nothing about what actually arrives:
anyone can POST anything. This guide is the rule for how to treat action
inputs.

## The rule

> A type in a Server Action signature is a statement of intent for the editor,
> not a guarantee. Validation at the boundary is what makes the type true.

Two consequences:

1. **Never write an action that would be dangerous if its param types were
   false.** Treat all inputs as untrusted.
2. **Where an action validates its input itself, type the param as `unknown`**
   and let the parse produce the real type. That is the honest description of
   what the code knows at each line.

## When to validate in the action

It depends on what the action does with the value:

| Action does...                                         | What to do                                                |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Acts on the input itself (cookie, file, query, writes) | Validate (Zod) or check against the session in the action |
| Only forwards it to an API that validates + authorizes | Typed signature is fine; the backend rejects bad values   |
| Read-only, harmless on bad input                       | Typed signature is fine; worst case is an error or empty  |

In this repo:

- `submitBooking`: validates with `createBookingSchema.safeParse(body)`.
  `body` is typed `unknown`; `validatedData.data` is the real, checked type.
- `updateBookingStatusAction`: forwards to the API, which validates the DTO,
  checks the transitions table and the session user. Typed params are fine.
- `setActiveRole`: checks the role against the session
  (`user.roles.includes(role)`) before touching the cookie. That is the right
  pattern for an action that acts on the input.
- `loadMoreHotels` / `loadHotelsInBounds`: read-only, forward to the API.

If one of the forwarding actions later does something meaningful with its input
itself, that is the moment to switch it to `unknown` plus a Zod parse.

## Zod in the action is the second line of defense

The backend (DTO validation, session checks, FK constraints) is what makes data
safe. The Zod parse in `submitBooking` is a cheap early gate: it rejects
malformed input before a network hop to the API. And because the same schema
(`src/schemas/booking.ts`) drives the react-hook-form resolver, the client and
the action cannot drift apart.

```ts
export async function submitBooking(body: unknown) {
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return { error: "Invalid booking data" };
  const booking = await createBooking(parsed.data); // typed from the schema
  ...
}
```

`createBooking` still expects the API-side `CreateBookingDto`. If the schema and
the DTO ever drift, `createBooking(parsed.data)` stops compiling, which is the
check that the two still mirror each other.

## Form side: awaiting the action

With react-hook-form, `handleSubmit` keeps `isSubmitting` true until the promise
returned by `onSubmit` settles. A Server Action is just an async function, so
`await` it directly; no `useTransition` is needed:

```tsx
const onBook: SubmitHandler<BookingForm> = async (data) => {
  setServerError("");
  const result = await submitBooking(data);
  if ("error" in result) return setServerError(result.error);
  router.push(`/booking/${result.booking.id}`);
};
```

Do **not** wrap the call in `startTransition(async () => ...)` inside `onSubmit`.
`startTransition` returns `undefined` rather than the inner promise, so `onBook`
resolves immediately and `isSubmitting` flips back to false while the request is
still in flight.

## Related

- Pricing and dates must also be authoritative on the server: the API derives
  the booker from the session and must compute price itself, never trusting the
  client (see the pricing data model in `hotels-api/docs/diagrams`).
