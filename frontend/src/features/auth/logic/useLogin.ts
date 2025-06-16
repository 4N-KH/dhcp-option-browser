import { useState, useEffect, useRef, useCallback } from "react";
import { login } from "@/services/auth.service";
import { AuthCredentialDto } from "@/types/dto/auth-credential.dto";
import { AuthMode } from "@/types/enum/auth-mode.enum";
import { Region } from "@/types/enum/region.enum";

// Manages login form state and submission logic
export const useLogin = (
  onLogin: (dto: AuthCredentialDto, remember: boolean) => void
) => {
  // Initial credential state
  const initialCredentials: AuthCredentialDto = {
    mode: AuthMode.GRID,
    username: "",
    password: "",
    apiKey: "",
    region: Region.EU,
    remember: false,
  };

  const [credentials, setCredentials] = useState<AuthCredentialDto>({
    ...initialCredentials,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input on mode change
  useEffect(() => {
    setFieldErrors({});
    firstInputRef.current?.focus();
  }, [credentials.mode]);

  // Handles input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target;
      const { name, value, type } = target;
      setCredentials((prev) => ({
        ...prev,
        [name]:
          type === "checkbox"
            ? (target as HTMLInputElement).checked
            : value,
      }));
    },
    []
  );

  // Validates required fields
  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};

    if (credentials.mode === AuthMode.GRID) {
      if (!credentials.username?.trim())
        errors.username = "Username is required.";
      if (!credentials.password?.trim())
        errors.password = "Password is required.";
    }

    if (credentials.mode === AuthMode.CSP) {
      if (!credentials.apiKey?.trim())
        errors.apiKey = "API Key is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Checks if form is valid
  const isValid = (): boolean => {
    if (credentials.mode === AuthMode.GRID) {
      return (
        !!credentials.username?.trim() &&
        !!credentials.password?.trim()
      );
    }
    if (credentials.mode === AuthMode.CSP) {
      return !!credentials.apiKey?.trim();
    }
    return false;
  };

  // Handles form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    if (!validateFields()) {
      setLoading(false);
      return;
    }

    const result = await login(credentials);
    if (!result.success) {
      setError(result.message || "Unknown server error");
    } else {
      onLogin(credentials, credentials.remember);
    }

    setLoading(false);
  };

  return {
    credentials,
    setCredentials,
    fieldErrors,
    error,
    loading,
    handleChange,
    handleSubmit,
    isValid,
    firstInputRef,
  };
};
