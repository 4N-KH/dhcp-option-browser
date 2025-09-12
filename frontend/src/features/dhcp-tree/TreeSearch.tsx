"use client";

import React, { useState, useRef, useEffect } from "react";

type Props = {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
};

export default function TreeSearch({ placeholder = "Find name, address, CIDR, IP…", onSearch, className = "" }: Props) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.setAttribute("aria-label", "DHCP tree search");
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };

  return (
    <form onSubmit={submit} className={`flex items-center gap-2 p-2 ${className}`}>
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)]"
      >
        Search
      </button>
    </form>
  );
}
