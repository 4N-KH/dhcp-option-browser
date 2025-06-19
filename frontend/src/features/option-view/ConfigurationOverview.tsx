import React from "react";
import { AuthCredentialDto } from "../../types/dto/auth-credential.dto";

interface Props {
  credentials: AuthCredentialDto;
}

const ConfigurationOverview: React.FC<Props> = ({ credentials }) => {
  return (
    <div className="max-w-xl mx-auto mt-12 p-[1px] rounded-3xl bg-gradient-to-r from-[#113873] via-[#1f5fd8] to-[#00a8ff] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="bg-[var(--background)] rounded-[22px] p-8 sm:p-10 font-sans text-[var(--foreground)] backdrop-blur-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center mb-8">
          Configuration Overview
        </h1>

        <div className="space-y-6 text-base sm:text-lg">
          <div className="flex justify-between border-b border-[var(--border)] pb-3">
            <span className="font-semibold tracking-wide uppercase text-sm opacity-80">Modus</span>
            <span className="font-medium">{credentials.mode}</span>
          </div>

          {credentials.mode === "grid" ? (
            <div className="flex justify-between border-b border-[var(--border)] pb-3">
              <span className="font-semibold tracking-wide uppercase text-sm opacity-80">Benutzer</span>
              <span className="font-medium">{credentials.username}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between border-b border-[var(--border)] pb-3">
                <span className="font-semibold tracking-wide uppercase text-sm opacity-80">API-Key</span>
                <span className="font-medium break-all max-w-[50%] text-right">{credentials.apiKey}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)] pb-3">
                <span className="font-semibold tracking-wide uppercase text-sm opacity-80">Region</span>
                <span className="font-medium">{credentials.region}</span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span className="font-semibold tracking-wide uppercase text-sm opacity-80">Remember</span>
            <span className="font-medium">{credentials.remember ? "Ja" : "Nein"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationOverview;
