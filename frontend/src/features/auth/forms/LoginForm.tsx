"use client";

import React, { useEffect, useRef } from "react";
import { useForm, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { loginSchema } from "../logic/login.schema";
import { AuthMode } from "@/types/enum/auth-mode.enum";
import AuthModeTabs from "../components/AuthModeTabs";
import GridLoginFields from "../components/GridLoginFields";
import CspLoginFields from "../components/CspLoginFields";
import RememberCheckbox from "../components/RememberCheckbox";
import { saveCspCredential } from "@/services/auth.service";
import { AuthCredentialDto } from "@/types/dto/auth-credential.dto";

export type LoginFormData = z.infer<typeof loginSchema>;

export interface FormUtils {
  watch: UseFormWatch<LoginFormData>;
  setValue: UseFormSetValue<LoginFormData>;
}

interface LoginFormProps {
  onLogin: (dto: AuthCredentialDto, remember: boolean) => Promise<void>;
  initialValues?: Partial<LoginFormData>;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, initialValues }) => {
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
      remember: false,
      ...initialValues,
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset({
        mode: initialValues.mode ?? AuthMode.GRID,
        username: initialValues.username ?? "",
        password: initialValues.password ?? "",
        apiKey: initialValues.apiKey ?? "",
        remember: initialValues.remember ?? false,
      });
    }
  }, [initialValues, reset]);

  const formUtils: FormUtils = { watch, setValue };
  const mode = watch("mode");
  const remember = watch("remember");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, [mode]);

  const onSubmit = async (data: LoginFormData) => {
    if (mode === AuthMode.CSP && remember && data.apiKey) {
      const saveResult = await saveCspCredential(data.apiKey);
      if (!saveResult.success) {
        alert(saveResult.message || "Could not save CSP credentials.");
        return;
      }
    }
    await onLogin(data, remember);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <AuthModeTabs selectedMode={mode} onSelect={(m) => setValue("mode", m)} />

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
          inputRef={firstInputRef}
          formUtils={formUtils}
        />
      )}

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

      {errors.root && (
        <p className="text-sm text-red-600 mt-3 text-center">
          {errors.root.message}
        </p>
      )}
    </form>
  );
};

export default LoginForm;
