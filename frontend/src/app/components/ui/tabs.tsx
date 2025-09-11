"use client";

import * as React from "react";

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

type TabsListProps = {
  className?: string;
  children: React.ReactNode;
};

type TabsTriggerProps = {
  value: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

type TabsContentProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

const TabsContext = React.createContext<{
  value: string;
  setValue: (val: string) => void;
} | null>(null);

export function Tabs({ value, onValueChange, className, children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 rounded-xl bg-[var(--accent-light)]/60 p-1 mb-3 shadow-inner ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  disabled,
  className,
  children,
}: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used inside <Tabs>");
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tab-panel-${value}`}
      disabled={disabled}
      onClick={() => !disabled && ctx.setValue(value)}
      className={`px-6 py-2 rounded-lg text-base font-semibold transition-all duration-200
        ${
          isActive
            ? "bg-[var(--accent)] text-white shadow ring-2 ring-[var(--accent)]"
            : "bg-transparent text-[var(--foreground)]/80 hover:bg-[var(--accent-light)]/90 hover:text-[var(--accent)]"
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className ?? ""}
      `}
      tabIndex={isActive ? 0 : -1}
      id={`tab-trigger-${value}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used inside <Tabs>");
  const isActive = ctx.value === value;

  return (
    <div
      role="tabpanel"
      id={`tab-panel-${value}`}
      aria-labelledby={`tab-trigger-${value}`}
      hidden={!isActive}
      className={`transition-all duration-200 ${isActive ? "block" : "hidden"} ${className ?? ""}`}
    >
      {isActive ? children : null}
    </div>
  );
}
