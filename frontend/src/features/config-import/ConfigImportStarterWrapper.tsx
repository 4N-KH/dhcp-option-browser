"use client";

import React from "react";
import { ConfigImportStarter } from "./ConfigImportStarter";

export default function ConfigImportStarterWrapper() {
  // All interactivity and event handlers belong here
  const handleImportSuccess = () => {
    // Optional: e.g. trigger reload, show summary etc.
    // window.location.reload();
  };

  return (
    <ConfigImportStarter onSuccess={handleImportSuccess} />
  );
}
