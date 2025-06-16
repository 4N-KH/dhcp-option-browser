import axios from "axios";
import { AuthCredentialDto } from "../types/dto/auth-credential.dto";

// API login response shape
export interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
}

// API base URL fallback for local dev
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Type guard for Axios errors
function isAxiosError(
  error: unknown
): error is {
  response?: {
    data?: {
      message?: string;
    };
  };
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  );
}

// Sends login request to backend
export const login = async (
  credentials: AuthCredentialDto
): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/auth/login`,
      credentials
    );
    return response.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Unknown server error",
      };
    }
    return {
      success: false,
      message: "Unexpected error occurred",
    };
  }
};
