"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProductsFiltersProps = {
  searchQuery: string;
  selectedBrand: string;
  selectedModel: string;
  brands: string[];
  models: string[];
};

export function ProductsFilters({
  searchQuery,
  selectedBrand,
  selectedModel,
  brands,
  models,
}: ProductsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchQuery);
  const [brand, setBrand] = useState(selectedBrand);
  const [model, setModel] = useState(selectedModel);

  const updateFilters = useCallback(
    (nextQuery: string, nextBrand: string, nextModel: string) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("page");

      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      } else {
        params.delete("q");
      }

      if (nextBrand.trim()) {
        params.set("brand", nextBrand.trim());
      } else {
        params.delete("brand");
      }

      if (nextModel.trim()) {
        params.set("model", nextModel.trim());
      } else {
        params.delete("model");
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
    const timeout = setTimeout(() => {
      if (
        query === searchQuery &&
        brand === selectedBrand &&
        model === selectedModel
      ) {
        return;
      }

      updateFilters(query, brand, model);
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    brand,
    model,
    query,
    searchQuery,
    selectedBrand,
    selectedModel,
    updateFilters,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
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

        <select
          value={brand}
          onChange={(event) => {
            const nextBrand = event.target.value;
            setBrand(nextBrand);
            setModel("");
          }}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
        >
          <option value="">Te gjitha brendet</option>
          {brands.map((brandOption) => (
            <option key={brandOption} value={brandOption}>
              {brandOption}
            </option>
          ))}
        </select>

        <select
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
        >
          <option value="">Te gjitha modelet</option>
          {models.map((modelOption) => (
            <option key={modelOption} value={modelOption}>
              {modelOption}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-500">
        {isPending
          ? "Duke filtruar..."
          : "Kerko automatikisht sapo te shkruash"}
      </p>
    </div>
  );
}
