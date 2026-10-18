"use client";

import { useState } from "react";
import { authClient } from "@/api/authClient";
import { type RegisterForm, registerSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import { GithubButton } from "@/components/auth/GithubButton";
import { buttonClass, inputClass } from "./styles";

export function RegisterFormView({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onRegister: SubmitHandler<RegisterForm> = async ({
    name,
    email,
    password,
  }) => {
    setServerError("");
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setServerError(error.message ?? "Register failed.");
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4 pt-12">
      <h1 className="text-xl font-semibold">Register</h1>
      <form
        onSubmit={handleSubmit(onRegister)}
        className="flex flex-col gap-4"
        noValidate
      >
        {serverError && (
          <p role="alert" className="text-sm text-red-600">
            {serverError}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className={inputClass}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
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
            autoComplete="new-password"
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
          {isSubmitting ? "Signing up..." : "Register"}
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
        Already have an account?{" "}
        <Link
          href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="font-medium text-blue-600 hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
