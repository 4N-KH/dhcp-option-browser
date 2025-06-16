// Renders CSP login fields: Region selector and secure API key input
import React, { useState } from "react";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import { Region } from "@/types/enum/region.enum";
import { LoginFormData } from "../forms/LoginForm";
import ShowHideToggleButton from "./ShowHideToggleButton";
import { FormUtils } from "../forms/LoginForm";

// Defines expected component props
interface Props {
  errors: FieldErrors<LoginFormData>;
  register: UseFormRegister<LoginFormData>;
  region: Region;
  inputRef: React.RefObject<HTMLInputElement | null>;
  formUtils: FormUtils;
}

const CspLoginFields: React.FC<Props> = ({
  register,
  errors,
  region,
  inputRef,
  formUtils,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  // current API key value, fallback to empty string
  const apiKeyValue = formUtils.watch("apiKey") ?? "";

  return (
    <div className="space-y-8 pt-6">
      {/* Region selector */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wider text-[var(--foreground)] mb-1">
          Region
        </label>
        <div className="flex gap-4">
          {[Region.EU, Region.US].map((r) => {
            const isSelected = region === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => formUtils.setValue("region", r)}
                className={`px-5 py-2 rounded-xl font-semibold uppercase tracking-wide text-sm backdrop-blur-sm border shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out transform
                  ${
                    isSelected
                      ? "bg-[var(--accent)]/95 text-white ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)] shadow-[0_0_0_4px_rgba(31,95,216,0.2)] scale-100 transition-shadow"
                      : "bg-[var(--accent-light)]/50 text-[var(--foreground)]/80 hover:ring-1 hover:ring-[var(--accent)] hover:ring-offset-1 hover:ring-offset-[var(--background)] hover:scale-[1.01]"
                  }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* API key input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wider text-[var(--foreground)] mb-1">
          API Key
        </label>
        <div className="relative">
          <input
            {...register("apiKey")}
            ref={(e) => {
              register("apiKey").ref(e);
              if (inputRef) inputRef.current = e;
            }}
            type={showApiKey ? "text" : "password"}
            autoComplete="off"
            className="mt-1 w-full px-5 py-3 rounded-xl border border-[var(--border)] backdrop-blur-sm bg-[var(--accent-light)]/95 text-[var(--foreground)] placeholder-gray-300 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-3 focus:ring-offset-[var(--background)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.15)] transition duration-300 ease-in-out"
            placeholder="Enter your API key"
          />
          {apiKeyValue.length > 0 && (
            <ShowHideToggleButton
              isVisible={showApiKey}
              onClick={() => setShowApiKey((prev) => !prev)}
            />
          )}
        </div>
        {errors.apiKey?.message && (
          <p className="text-sm text-[var(--danger)] mt-1">
            {errors.apiKey.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default CspLoginFields;
