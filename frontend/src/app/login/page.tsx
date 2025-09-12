"use client";

import LoginPage from "@/features/auth/views/LoginPage";
import { useRouter } from "next/navigation";
import { AuthCredentialDto } from "@/types/dto/auth-credential.dto";

export default function Page() {
  const router = useRouter();

  const handleLogin = (dto: AuthCredentialDto, remember: boolean) => {
    console.log("LOGIN OK", dto, remember);
    router.push("/overview");
  };

  return <LoginPage onLogin={handleLogin} />;
}
