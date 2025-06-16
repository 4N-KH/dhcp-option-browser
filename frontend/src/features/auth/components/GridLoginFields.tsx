// Renders Grid login fields: Username and secure Password input
import React, { useState } from "react";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import { LoginFormData } from "../forms/LoginForm";
import ShowHideToggleButton from "./ShowHideToggleButton";
import { FormUtils } from "../forms/LoginForm";

// Defines expected component props
interface Props {
  errors: FieldErrors<LoginFormData>;
  register: UseFormRegister<LoginFormData>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  formUtils: FormUtils;
}

const GridLoginFields: React.FC<Props> = ({ register, errors, inputRef, formUtils }) => {
  const [showPassword, setShowPassword] = useState(false);
  // current password value, fallback to empty string
  const passwordValue = formUtils.watch("password") ?? "";

  return (
    <div className="space-y-8 pt-6">
      {/* Username input */}
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="block text-sm font-semibold uppercase tracking-wider text-[var(--foreground)] mb-1"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          autoComplete="off"
          {...register("username")}
          ref={(el) => {
            inputRef.current = el;
            return register("username").ref(el);
          }}
          className="mt-1 w-full px-5 py-3 rounded-xl border border-[var(--border)] backdrop-blur-sm bg-[var(--accent-light)]/95 text-[var(--foreground)] placeholder-gray-300 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-3 focus:ring-offset-[var(--background)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.15)] transition duration-300 ease-in-out"
          placeholder="Enter your username"
        />
        {errors.username?.message && (
          <p className="text-sm text-[var(--danger)] mt-1">{errors.username.message}</p>
        )}
      </div>

      {/* Password input */}
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-semibold uppercase tracking-wider text-[var(--foreground)] mb-1"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            {...register("password")}
            className="mt-1 w-full px-5 py-3 rounded-xl border border-[var(--border)] backdrop-blur-sm bg-[var(--accent-light)]/95 text-[var(--foreground)] placeholder-gray-300 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-3 focus:ring-offset-[var(--background)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.15)] transition duration-300 ease-in-out"
            placeholder="Enter your password"
          />
          {passwordValue.length > 0 && (
            <ShowHideToggleButton
              isVisible={showPassword}
              onClick={() => setShowPassword((prev) => !prev)}
            />
          )}
        </div>
        {errors.password?.message && (
          <p className="text-sm text-[var(--danger)] mt-1">{errors.password.message}</p>
        )}
      </div>
    </div>
  );
};

export default GridLoginFields;
