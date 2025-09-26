// Renders CSP login fields: secure API Key input
import React, { useState } from "react";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import { LoginFormData } from "../forms/LoginForm";
import ShowHideToggleButton from "./ShowHideToggleButton";
import { FormUtils } from "../forms/LoginForm";

interface Props {
  errors: FieldErrors<LoginFormData>;
  register: UseFormRegister<LoginFormData>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  formUtils: FormUtils;
}

const CspLoginFields: React.FC<Props> = ({
  register,
  errors,
  inputRef,
  formUtils,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKeyValue = formUtils.watch("apiKey") ?? "";

  return (
    <div className="space-y-8 pt-6">
      {/* API key input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold uppercase tracking-wider text-[var(--foreground)] mb-1">
          API Key
        </label>
        <div className="flex items-center w-full">
          <input
            {...register("apiKey")}
            ref={(e) => {
              register("apiKey").ref(e);
              if (inputRef) inputRef.current = e;
            }}
            type={showApiKey ? "text" : "password"}
            autoComplete="off"
            className="flex-1 mt-1 px-5 py-3 rounded-xl border border-[var(--border)] backdrop-blur-sm bg-[var(--accent-light)]/95 text-[var(--foreground)] placeholder-gray-300 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-3 focus:ring-offset-[var(--background)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.15)] transition duration-300 ease-in-out"
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
