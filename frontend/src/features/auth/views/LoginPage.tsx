"use client";

import Image from "next/image";
import LoginForm from "../forms/LoginForm";
import { AuthCredentialDto } from "@/types/dto/auth-credential.dto";

interface LoginPageProps {
  onLogin: (dto: AuthCredentialDto, remember: boolean) => void;
}

// Renders full-screen login page with styled container
const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)] px-4 sm:px-6 font-sans relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md sm:max-w-lg p-[2px] rounded-3xl bg-gradient-to-r from-[#1c355e] via-[#2b60c5] to-[#5faaff] shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.005] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]">
        <div className="relative bg-[rgba(15,23,42,0.35)] backdrop-blur-[18px] rounded-[22px] p-10 sm:p-12 border border-[rgba(255,255,255,0.08)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.2)]">
          {/* Light glass overlay */}
          <div className="absolute inset-0 rounded-[22px] pointer-events-none bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-transparent" />

          {/* 4N logo */}
          <div className="relative flex justify-center mb-6 z-10">
            <Image
              src="/4N_Logo.png"
              alt="4N Logo"
              width={110}
              height={110}
              className="object-contain opacity-75 transition-opacity duration-700 ease-in-out drop-shadow-[0_0_5px_white] mix-blend-lighten"
              priority
              unoptimized
            />
          </div>

          {/* Header */}
          <div className="relative mb-10 text-center z-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[0.02em] text-[var(--foreground)] mb-3 leading-[1.15]">
              Connect to Target System
            </h1>
            {/* Optional: Subheader */}
            {/* <p className="text-base text-[var(--foreground)] opacity-70">
              Secure DHCP Configuration Access
            </p> */}
          </div>

          {/* Login form */}
          <div className="relative z-10">
            <LoginForm onLogin={onLogin} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
