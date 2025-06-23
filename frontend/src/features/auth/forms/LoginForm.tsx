"use client";

import React, { useEffect, useRef } from "react";
import { useForm, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { loginSchema } from "../logic/login.schema";
import { AuthMode } from "@/types/enum/auth-mode.enum";
import { Region } from "@/types/enum/region.enum";
import AuthModeTabs from "../components/AuthModeTabs";
import GridLoginFields from "../components/GridLoginFields";
import CspLoginFields from "../components/CspLoginFields";
import RememberCheckbox from "../components/RememberCheckbox";
import { login, saveCspCredential } from "@/services/auth.service";
import { AuthCredentialDto } from "@/types/dto/auth-credential.dto";

export type LoginFormData = z.infer<typeof loginSchema>;

// Utility for grouping form control methods for child components
export interface FormUtils {
  watch: UseFormWatch<LoginFormData>;
  setValue: UseFormSetValue<LoginFormData>;
}

interface LoginFormProps {
  onLogin: (dto: AuthCredentialDto, remember: boolean) => void;
  initialValues?: Partial<LoginFormData>;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, initialValues }) => {
  // Initialise form with react-hook-form and Zod schema validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
    reset,
  } = useForm<LoginFormData>({
    mode: "onChange",
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mode: AuthMode.GRID,
      username: "",
      password: "",
      apiKey: "",
      region: Region.EU,
      remember: false,
      ...initialValues, // Autofill if provided
    },
  });

  // Ensure autofill applies if initialValues change
  useEffect(() => {
    if (initialValues) {
      reset({
        mode: initialValues.mode ?? AuthMode.GRID,
        username: initialValues.username ?? "",
        password: initialValues.password ?? "",
        apiKey: initialValues.apiKey ?? "",
        region: initialValues.region ?? Region.EU,
        remember: initialValues.remember ?? false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const formUtils: FormUtils = { watch, setValue };

  const mode = watch("mode");
  const region = watch("region") ?? Region.EU;
  const remember = watch("remember");
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Set focus to the first field when mode changes
  useEffect(() => {
    firstInputRef.current?.focus();
  }, [mode]);

  // Handles form submission, including secure credential storage for CSP
  const onSubmit = async (data: LoginFormData) => {
    if (mode === AuthMode.CSP && remember && data.apiKey) {
      const saveResult = await saveCspCredential(data.apiKey, region);
      if (!saveResult.success) {
        alert(saveResult.message || "Could not save CSP credentials.");
        return;
      }
    }
    const loginResult = await login(data);
    if (loginResult.success) {
      onLogin(data, remember);
    } else {
      alert(loginResult.message || "Unknown error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 font-sans transition-all duration-300"
    >
      {/* Authentication mode selection */}
      <AuthModeTabs selectedMode={mode} onSelect={(m) => setValue("mode", m)} />

      {/* Render input fields based on mode */}
      {mode === AuthMode.GRID && (
        <GridLoginFields
          register={register}
          errors={errors}
          inputRef={firstInputRef}
          formUtils={formUtils}
        />
      )}

      {mode === AuthMode.CSP && (
        <CspLoginFields
          register={register}
          errors={errors}
          region={region}
          inputRef={firstInputRef}
          formUtils={formUtils}
        />
      )}

      {/* Remember me and submit button */}
      <div className="pt-4 flex items-center justify-between">
        <RememberCheckbox
          checked={remember}
          onChange={(e) => setValue("remember", e.target.checked)}
        />

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={`px-6 py-3 rounded-xl font-semibold text-base tracking-wide transition-all duration-300
            ${
              isValid && !isSubmitting
                ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[0_4px_12px_rgba(31,95,216,0.35)] hover:scale-[1.02]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </div>

      {/* Display root-level errors */}
      {errors.root && (
        <p className="text-sm text-red-600 mt-3 text-center">
          {errors.root.message}
        </p>
      )}
    </form>
  );
};

export default LoginForm;
