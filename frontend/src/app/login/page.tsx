"use client";

import LoginPage from "@/features/auth/views/LoginPage";
import { useRouter } from "next/navigation";
import { AuthCredentialDto } from "@/types/dto/auth-credential.dto";
import { login, type AuthResponse } from "@/services/auth.service";

export default function Page() {
  const router = useRouter();

  const handleLogin = async (dto: AuthCredentialDto): Promise<void> => {
    const result: AuthResponse = await login(dto);
    if (!result.success) {
      alert(result.message || "Login failed");
      return;
    }

    if (result.token) {
      localStorage.setItem("jwt_token", result.token);
    }

    const query = result.hashChanged ? "?needsImport=1" : "";
    router.push("/overview" + query);
  };

  return <LoginPage onLogin={handleLogin} />;
}
