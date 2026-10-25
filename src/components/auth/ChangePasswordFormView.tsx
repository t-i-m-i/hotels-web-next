"use client";

import { useState } from "react";
import { authClient } from "@/api/authClient";
import { type ChangePasswordForm, changePasswordSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { buttonClass, inputClass } from "./styles";

export function ChangePasswordFormView() {
  const [serverError, setServerError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onChangePassword: SubmitHandler<ChangePasswordForm> = async ({
    currentPassword,
    newPassword,
  }) => {
    setServerError("");
    setSuccess(false);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true, // a password change should end other sessions
    });
    if (error) {
      setServerError(error.message ?? "Failed to change password.");
      return;
    }
    setSuccess(true);
    reset();
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4 pt-12">
      <h1 className="text-xl font-semibold">Change password</h1>

      <form
        onSubmit={handleSubmit(onChangePassword)}
        className="flex flex-col gap-4"
        noValidate
      >
        {serverError && (
          <p role="alert" className="text-sm text-red-600">
            {serverError}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm text-green-600">
            Password changed successfully!
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="currentPassword" className="text-sm font-medium">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className="text-sm text-red-600">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="newPassword" className="text-sm font-medium">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-600">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {isSubmitting ? "Changing password..." : "Change password"}
        </button>
      </form>
    </div>
  );
}
