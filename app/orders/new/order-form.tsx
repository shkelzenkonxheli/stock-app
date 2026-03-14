"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type OrderVariant = {
  id: number;
  productId: number;
  productLabel: string;
  size: string;
  color: string;
  imagePath: string | null;
  stock: number;
  price: number;
};

type OrderFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  variants: OrderVariant[];
};

type OrderSource = "INSTAGRAM" | "STORE" | "WHOLESALE";

type OrderItemRow = {
  id: string;
  productId: string;
  variantId: string;
  quantity: string;
};

const sourceOptions: Array<{ value: OrderSource; label: string }> = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "STORE", label: "Shitore" },
  { value: "WHOLESALE", label: "Shumice" },
];

function createEmptyRow(): OrderItemRow {
  return {
    id: crypto.randomUUID(),
    productId: "",
    variantId: "",
    quantity: "1",
  };
}

export function OrderForm({ action, variants }: OrderFormProps) {
  const products = useMemo(() => {
    const seen = new Map<number, string>();

    for (const variant of variants) {
      if (!seen.has(variant.productId)) {
        seen.set(variant.productId, variant.productLabel);
      }
    }

    return Array.from(seen, ([id, label]) => ({ id, label }));
  }, [variants]);

  const [source, setSource] = useState<OrderSource>("INSTAGRAM");
  const [rows, setRows] = useState<OrderItemRow[]>([createEmptyRow()]);

  const reservedByVariant = useMemo(() => {
    const totals = new Map<number, number>();

    for (const row of rows) {
      const variantId = Number(row.variantId);
      const quantity = Number(row.quantity) || 0;

      if (!variantId || quantity <= 0) {
        continue;
      }

      totals.set(variantId, (totals.get(variantId) ?? 0) + quantity);
    }

    return totals;
  }, [rows]);

  const updateRow = (
    rowId: string,
    field: keyof Omit<OrderItemRow, "id">,
    value: string,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (field === "productId") {
          return {
            ...row,
            productId: value,
            variantId: "",
          };
        }

        return {
          ...row,
          [field]: value,
        };
      }),
    );
  };

  const addRow = () => {
    setRows((currentRows) => [...currentRows, createEmptyRow()]);
  };

  const removeRow = (rowId: string) => {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  };

  const selectedItems = rows
    .map((row) => {
      const variant = variants.find((item) => item.id === Number(row.variantId));

      if (!variant) {
        return null;
      }

      return {
        ...variant,
        quantity: Number(row.quantity) || 0,
      };
    })
    .filter((item): item is OrderVariant & { quantity: number } => item !== null);
  const totalPairs = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const serializedItems = JSON.stringify(
    rows
      .map((row) => ({
        variantId: Number(row.variantId),
        quantity: Number(row.quantity),
      }))
      .filter((row) => row.variantId > 0 && row.quantity > 0),
  );

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="items" value={serializedItems} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-800">Prej nga erdhi porosia</p>
        <div className="grid grid-cols-3 gap-2 sm:w-auto">
          {sourceOptions.map((option) => {
            const active = source === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSource(option.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-slate-950">Artikujt e porosise</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {selectedItems.length} artikuj
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {totalPairs} pale
            </span>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            + Shto artikull
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => {
            const rowVariantId = Number(row.variantId);
            const rowQuantity = Number(row.quantity) || 0;
            const filteredVariants = variants
              .filter((variant) =>
                row.productId ? variant.productId === Number(row.productId) : false,
              )
              .map((variant) => {
                const reservedElsewhere =
                  (reservedByVariant.get(variant.id) ?? 0) -
                  (variant.id === rowVariantId ? rowQuantity : 0);

                return {
                  ...variant,
                  availableStock: Math.max(variant.stock - reservedElsewhere, 0),
                };
              })
              .filter(
                (variant) =>
                  variant.availableStock > 0 || variant.id === rowVariantId,
              );
            const selectedVariant = filteredVariants.find(
              (variant) => variant.id === Number(row.variantId),
            );

            return (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <p className="text-sm font-semibold text-slate-900">Artikulli {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Hiq
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1.2fr_120px]">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-800">
                      Produkti
                    </label>
                    <select
                      value={row.productId}
                      onChange={(event) =>
                        updateRow(row.id, "productId", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="">Zgjedh produktin</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-800">
                      Varianti
                    </label>
                    <select
                      value={row.variantId}
                      onChange={(event) =>
                        updateRow(row.id, "variantId", event.target.value)
                      }
                      disabled={!row.productId}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">
                        {row.productId
                          ? "Zgjedh variantin"
                          : "Zgjedh fillimisht produktin"}
                      </option>
                      {filteredVariants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          Nr {variant.size} | {variant.color} | stok {variant.availableStock} |{" "}
                          {variant.price.toFixed(2)} EUR
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-800">
                      Sasia
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(event) =>
                        updateRow(row.id, "quantity", event.target.value)
                      }
                      max={selectedVariant?.availableStock ?? undefined}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                {selectedVariant ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 sm:flex-row sm:items-center">
                    <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {selectedVariant.imagePath ? (
                        <img
                          src={selectedVariant.imagePath}
                          alt={`${selectedVariant.productLabel} ${selectedVariant.color}`}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
                        Nr {selectedVariant.size} / {selectedVariant.color}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700">
                        stok {selectedVariant.availableStock}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700">
                        {selectedVariant.price.toFixed(2)} EUR
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {selectedItems.length > 0 ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
          <p className="text-sm font-semibold text-slate-950">Zgjedhjet deri tani</p>
          <div className="mt-3 space-y-2">
            {selectedItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-white/90 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {item.imagePath ? (
                      <img
                        src={item.imagePath}
                        alt={`${item.productLabel} ${item.color}`}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="font-medium text-slate-900">
                    {item.productLabel} | Nr {item.size} | {item.color}
                  </p>
                </div>
                <p className="text-slate-600">
                  {item.quantity} cope | {item.price.toFixed(2)} EUR
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="customerName"
            className="block text-sm font-medium text-slate-800"
          >
            Emri i klientit
          </label>
          <input
            id="customerName"
            name="customerName"
            type="text"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            placeholder="p.sh. Ardit Krasniqi"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-slate-800"
          >
            Telefoni
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            placeholder="p.sh. 044123456"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="instagram"
            className="block text-sm font-medium text-slate-800"
          >
            Username / Referenca
          </label>
          <input
            id="instagram"
            name="instagram"
            type="text"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            placeholder="p.sh. @klienti ose referenca e porosise"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Artikuj ne porosi
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {totalPairs}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-slate-800"
        >
          Shenime
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          placeholder="Adresa, komente shtese, menyra e dorezimit..."
        />
      </div>

      <div className="flex flex-col gap-3 pt-3 sm:flex-row">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(5,150,105,0.24)] transition hover:bg-emerald-500"
        >
          Ruaj porosine
        </button>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Shiko produktet
        </Link>
      </div>
    </form>
  );
}
