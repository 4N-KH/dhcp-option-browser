import axios from "axios";
import { AuthCredentialDto } from "../types/dto/auth-credential.dto";
// import { Region } from "../types/enum/region.enum"; // REGION: vorläufig deaktiviert

// Login/credentials API response shape
export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
}

// --- API Base URL Resolver (Client vs SSR/Docker) ---
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-Side (Docker Container)
    return process.env.API_BASE_URL || "http://dhcp-backend:3001";
  }
  // Client-Side (Browser)
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

const API_BASE_URL = getApiBaseUrl();

function getToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("jwtToken")
    : null;
}

// Adds Authorization header if token exists
function withAuthHeaders() {
  const token = getToken();
  return token
    ? { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
    : { withCredentials: true };
}

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
  return typeof error === "object" && error !== null && "response" in error;
}

// ---- Login-Flow (Grid & CSP) ----
export const login = async (
  credentials: AuthCredentialDto
): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/auth/login`,
      credentials,
      { withCredentials: true }
    );
    // If login succeeds and a token is returned, save it
    if (response.data.success && response.data.token) {
      localStorage.setItem("jwtToken", response.data.token);
    }
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

// ---- Save CSP credentials (API key) for current user ----
export const saveCspCredential = async (
  apiKey: string
  // , region: Region // REGION: vorläufig deaktiviert
): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/credentials/csp`,
      // { apiKey, region }, // REGION: vorläufig deaktiviert
      { apiKey },
      withAuthHeaders()
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

// ---- Get CSP credentials for autofill (regionlos) ----
export const getCspCredential = async (
  // region: Region // REGION: vorläufig deaktiviert
): Promise<{ apiKey?: string; success: boolean; message?: string }> => {
  try {
    const response = await axios.get<{ apiKey: string }>(
      `${API_BASE_URL}/credentials/csp`,
      // { params: { region }, ...withAuthHeaders() } // REGION: vorläufig deaktiviert
      { ...withAuthHeaders() }
    );
    return { apiKey: response.data.apiKey, success: true };
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

// ---- (Optional) Delete CSP credentials (regionlos) ----
export const deleteCspCredential = async (
  // region: Region // REGION: vorläufig deaktiviert
): Promise<AuthResponse> => {
  try {
    const response = await axios.delete<AuthResponse>(
      `${API_BASE_URL}/credentials/csp`,
      // { params: { region }, ...withAuthHeaders() } // REGION: vorläufig deaktiviert
      { ...withAuthHeaders() }
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
