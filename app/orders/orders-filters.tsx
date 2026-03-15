"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type OrdersFiltersProps = {
  searchQuery: string;
  selectedStatus: string;
  selectedSource: string;
};

export function OrdersFilters({
  searchQuery,
  selectedStatus,
  selectedSource,
}: OrdersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchQuery);
  const [status, setStatus] = useState(selectedStatus);
  const [source, setSource] = useState(selectedSource);

  const updateFilters = useCallback(
    (nextQuery: string, nextStatus: string, nextSource: string) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("page");

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      } else {
        params.delete("q");
      }

      if (nextStatus) {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }

      if (nextSource) {
        params.set("source", nextSource);
      } else {
        params.delete("source");
      }

      const nextUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      startTransition(() => {
        router.replace(nextUrl);
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setStatus(selectedStatus);
  }, [selectedStatus]);

  useEffect(() => {
    setSource(selectedSource);
  }, [selectedSource]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (
        query === searchQuery &&
        status === selectedStatus &&
        source === selectedSource
      ) {
        return;
      }

      updateFilters(query, status, source);
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    query,
    status,
    source,
    searchQuery,
    selectedStatus,
    selectedSource,
    updateFilters,
  ]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
      <div className="space-y-1">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kerko klient, telefon, reference"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
        />
        <p className="text-xs text-slate-500">
          {isPending
            ? "Duke filtruar..."
            : "Kerko automatikisht sapo te shkruash"}
        </p>
      </div>

      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="w-45 h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
      >
        <option value="">Te gjitha statuset</option>
        <option value="NEW">NEW</option>
        <option value="READY">READY</option>
        <option value="DONE">DONE</option>
        <option value="CANCELED">CANCELED</option>
      </select>

      <select
        value={source}
        onChange={(event) => setSource(event.target.value)}
        className="w-45 h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
      >
        <option value="">Te gjitha burimet</option>
        <option value="INSTAGRAM">Instagram</option>
        <option value="STORE">Shitore</option>
        <option value="WHOLESALE">Shumice</option>
      </select>
    </div>
  );
}
