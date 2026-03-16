"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProductVariantsFiltersProps = {
  selectedSize: string;
  selectedColor: string;
  selectedStock: string;
  sizes: string[];
  colors: string[];
};

export function ProductVariantsFilters({
  selectedSize,
  selectedColor,
  selectedStock,
  sizes,
  colors,
}: ProductVariantsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [size, setSize] = useState(selectedSize);
  const [color, setColor] = useState(selectedColor);
  const [stock, setStock] = useState(selectedStock);

  const updateFilters = useCallback(
    (nextSize: string, nextColor: string, nextStock: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextSize) {
        params.set("size", nextSize);
      } else {
        params.delete("size");
      }

      if (nextColor) {
        params.set("color", nextColor);
      } else {
        params.delete("color");
      }

      if (nextStock) {
        params.set("stock", nextStock);
      } else {
        params.delete("stock");
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
    setSize(selectedSize);
  }, [selectedSize]);

  useEffect(() => {
    setColor(selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    setStock(selectedStock);
  }, [selectedStock]);

  useEffect(() => {
    if (
      size === selectedSize &&
      color === selectedColor &&
      stock === selectedStock
    ) {
      return;
    }

    updateFilters(size, color, stock);
  }, [
    size,
    color,
    stock,
    selectedSize,
    selectedColor,
    selectedStock,
    updateFilters,
  ]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <select
          value={size}
          onChange={(event) => setSize(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
        >
          <option value="">Te gjithe numrat</option>
          {sizes.map((item) => (
            <option key={item} value={item}>
              Nr {item}
            </option>
          ))}
        </select>

        <select
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
        >
          <option value="">Te gjitha ngjyrat</option>
          {colors.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
        >
          <option value="">Gjithe stoku</option>
          <option value="in">Ne stok</option>
          <option value="low">Stok i ulet</option>
          <option value="out">Pa stok</option>
        </select>
      </div>
    </div>
  );
}
