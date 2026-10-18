"use client";

import { useState } from "react";
import { authClient } from "@/api/authClient";
import { type LoginForm, loginSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import { GithubButton } from "@/components/auth/GithubButton";
import { buttonClass, inputClass } from "./styles";

export function LoginFormView({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onLogin: SubmitHandler<LoginForm> = async ({ email, password }) => {
    setServerError("");
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setServerError(error.message ?? "Login failed.");
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4 pt-12">
      <h1 className="text-xl font-semibold">Login</h1>
      <form
        onSubmit={handleSubmit(onLogin)}
        className="flex flex-col gap-4"
        noValidate
      >
        {serverError && (
          <p role="alert" className="text-sm text-red-600">
            {serverError}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
        or
        <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
      </div>
      <GithubButton
        redirectTo={redirectTo}
        disabled={isSubmitting}
        onError={setServerError}
      />
      <p className="text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="font-medium text-blue-600 hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
