import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().nonempty("Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().nonempty("Name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().nonempty("Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().nonempty("Please confirm the new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Where to send the user after login. Comes from the URL (?redirectTo=...), so
// it's attacker-controlled: only same-origin paths are accepted, anything else
// (missing, an absolute URL, `//evil.com`, `/\\evil.com`, `javascript:`) falls
// back to "/". Parsing against a dummy base and comparing origins catches the
// backslash/protocol-relative tricks that a simple startsWith("/") check
// misses. A repeated param (?redirectTo=a&redirectTo=b) arrives as an array,
// so the first value wins.
const REDIRECT_BASE = "http://localhost";

// 1. new URL("/my-bookings", "http://localhost") resolves to http://localhost/my-bookings, whose origin is http://localhost. That matches the base, so the value is accepted.
// 2. new URL("//evil.com", "http://localhost") resolves to http://evil.com/, whose origin is http://evil.com. That doesn't match the base, so it's rejected.
export const redirectToSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z
    .string()
    .refine(
      (value) =>
        value.startsWith("/") &&
        new URL(value, REDIRECT_BASE).origin === REDIRECT_BASE,
    )
    .catch("/"),
);

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
