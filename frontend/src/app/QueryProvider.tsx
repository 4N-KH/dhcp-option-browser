"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

// Provides React Query client to the app
export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient()); // Create client once
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
