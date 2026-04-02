"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProductsFiltersProps = {
  searchQuery: string;
};

export function ProductsFilters({ searchQuery }: ProductsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchQuery);

  const updateFilters = useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("page");

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      } else {
        params.delete("q");
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
    const timeout = setTimeout(() => {
      if (query === searchQuery) {
        return;
      }

      updateFilters(query);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, searchQuery, updateFilters]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 stroke-[1.8]"
        >
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtro sipas modelit ose brendit..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
        />
      </div>
      <p className="text-xs text-slate-500">
        {isPending ? "Duke filtruar..." : "Kerko automatikisht sapo te shkruash"}
      </p>
    </div>
  );
}
