"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UploadedImage } from "@/app/components/uploaded-image";

type ProductOption = {
  id: number;
  label: string;
};

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

type QuickOrdersFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
};

type OrderSource = "INSTAGRAM" | "STORE" | "WHOLESALE";

type QuickOrderRow = {
  id: string;
  productId: string;
  variantId: string;
  customerName: string;
  reference: string;
  price: string;
};

const sourceOptions: Array<{ value: OrderSource; label: string }> = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "STORE", label: "Shitore" },
  { value: "WHOLESALE", label: "Shumice" },
];

function createEmptyRow(): QuickOrderRow {
  return {
    id: crypto.randomUUID(),
    productId: "",
    variantId: "",
    customerName: "",
    reference: "",
    price: "",
  };
}

export function QuickOrdersForm({ action, products }: QuickOrdersFormProps) {
  const [source, setSource] = useState<OrderSource>("INSTAGRAM");
  const [rows, setRows] = useState<QuickOrderRow[]>([createEmptyRow()]);
  const [variantsByProduct, setVariantsByProduct] = useState<
    Record<number, OrderVariant[]>
  >({});
  const [loadingProducts, setLoadingProducts] = useState<Record<number, boolean>>(
    {},
  );

  useEffect(() => {
    const productIdsToLoad = [
      ...new Set(
        rows
          .map((row) => Number(row.productId))
          .filter((productId) => productId > 0 && !variantsByProduct[productId]),
      ),
    ];

    if (productIdsToLoad.length === 0) {
      return;
    }

    let isCancelled = false;

    const loadVariants = async () => {
      for (const productId of productIdsToLoad) {
        setLoadingProducts((current) => ({ ...current, [productId]: true }));

        try {
          const response = await fetch(`/api/products/${productId}/variants`, {
            cache: "no-store",
          });

          if (!response.ok) {
            continue;
          }

          const data = (await response.json()) as OrderVariant[];

          if (!isCancelled) {
            setVariantsByProduct((current) => ({
              ...current,
              [productId]: data,
            }));
          }
        } finally {
          if (!isCancelled) {
            setLoadingProducts((current) => ({ ...current, [productId]: false }));
          }
        }
      }
    };

    void loadVariants();

    return () => {
      isCancelled = true;
    };
  }, [rows, variantsByProduct]);

  const variantUsage = useMemo(() => {
    const totals = new Map<number, number>();

    for (const row of rows) {
      const variantId = Number(row.variantId);
      if (!variantId) {
        continue;
      }

      totals.set(variantId, (totals.get(variantId) ?? 0) + 1);
    }

    return totals;
  }, [rows]);

  const updateRow = (
    rowId: string,
    field: keyof Omit<QuickOrderRow, "id">,
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
            price: "",
          };
        }

        if (field === "variantId") {
          const variant = Object.values(variantsByProduct)
            .flat()
            .find((item) => item.id === Number(value));

          return {
            ...row,
            variantId: value,
            price: variant ? variant.price.toFixed(2) : row.price,
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

  const copyRow = (rowId: string) => {
    setRows((currentRows) => {
      const rowToCopy = currentRows.find((row) => row.id === rowId);

      if (!rowToCopy) {
        return currentRows;
      }

      return [
        ...currentRows,
        {
          ...rowToCopy,
          id: crypto.randomUUID(),
        },
      ];
    });
  };

  const removeRow = (rowId: string) => {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.id !== rowId);
    });
  };

  const serializedRows = JSON.stringify(
    rows
      .map((row) => ({
        variantId: Number(row.variantId),
        customerName: row.customerName.trim(),
        reference: row.reference.trim(),
        price: row.price.trim(),
      }))
      .filter(
        (row) =>
          row.variantId > 0 &&
          row.customerName.length > 0 &&
          row.price.length > 0,
      ),
  );

  const readyRows = rows.filter(
    (row) =>
      Number(row.variantId) > 0 &&
      row.customerName.trim().length > 0 &&
      row.price.trim().length > 0,
  ).length;
  const selectedVariantsPreview = rows
    .map((row) => {
      const variantId = Number(row.variantId);

      if (!variantId) {
        return null;
      }

      return Object.values(variantsByProduct)
        .flat()
        .find((variant) => variant.id === variantId) ?? null;
    })
    .filter((variant): variant is OrderVariant => variant !== null);

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="rows" value={serializedRows} />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <span className="text-sm font-medium text-slate-800">Burimi:</span>
        <div className="flex flex-wrap gap-2">
          {sourceOptions.map((option) => {
            const active = source === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSource(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
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
            <p className="text-sm font-semibold text-slate-950">
              Porosite e shpejta
            </p>
            {selectedVariantsPreview.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectedVariantsPreview.slice(0, 4).map((variant, index) => (
                  <div
                    key={`${variant.id}-${index}`}
                    className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5"
                  >
                    <div className="h-7 w-7 overflow-hidden rounded-full border border-slate-200 bg-white">
                      {variant.imagePath ? (
                        <UploadedImage
                          src={variant.imagePath}
                          alt={`${variant.productLabel} ${variant.color}`}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <span className="text-xs font-medium text-emerald-800">
                      Nr {variant.size} / {variant.color}
                    </span>
                  </div>
                ))}
                {selectedVariantsPreview.length > 4 ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    +{selectedVariantsPreview.length - 4}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                {readyRows} gati
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            + Shto rresht
          </button>
        </div>

        <div className="space-y-3 lg:hidden">
          {rows.map((row, index) => {
            const selectedProductId = Number(row.productId);
            const productVariants = selectedProductId
              ? variantsByProduct[selectedProductId] ?? []
              : [];
            const rowVariantId = Number(row.variantId);
            const filteredVariants = productVariants
              .map((variant) => ({
                ...variant,
                availableStock:
                  variant.stock -
                  ((variantUsage.get(variant.id) ?? 0) - (variant.id === rowVariantId ? 1 : 0)),
              }))
              .filter((variant) => variant.availableStock > 0 || variant.id === rowVariantId);
            const isLoadingVariants = selectedProductId
              ? Boolean(loadingProducts[selectedProductId])
              : false;

            return (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Rreshti {index + 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyRow(row.id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Kopjo
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Hiq
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <select
                    value={row.productId}
                    onChange={(event) =>
                      updateRow(row.id, "productId", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Zgjedh produktin</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={row.variantId}
                    onChange={(event) =>
                      updateRow(row.id, "variantId", event.target.value)
                    }
                    disabled={!row.productId || isLoadingVariants}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {!row.productId
                        ? "Zgjedh produktin"
                        : isLoadingVariants
                          ? "Duke ngarkuar variantet..."
                          : filteredVariants.length === 0
                            ? "Nuk ka stok"
                            : "Zgjedh variantin"}
                    </option>
                    {filteredVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        Nr {variant.size} | {variant.color} | stok {variant.availableStock}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={row.customerName}
                    onChange={(event) =>
                      updateRow(row.id, "customerName", event.target.value)
                    }
                    placeholder="Emri i klientit"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />

                  <input
                    type="text"
                    value={row.reference}
                    onChange={(event) =>
                      updateRow(row.id, "reference", event.target.value)
                    }
                    placeholder="Referenca / username"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(event) =>
                      updateRow(row.id, "price", event.target.value)
                    }
                    placeholder="Cmimi"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3">Produkti</th>
                <th className="px-4 py-3">Varianti</th>
                <th className="px-4 py-3">Klienti</th>
                <th className="px-4 py-3">Referenca</th>
                <th className="px-4 py-3">Cmimi</th>
                <th className="px-4 py-3 text-right">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => {
                const selectedProductId = Number(row.productId);
                const productVariants = selectedProductId
                  ? variantsByProduct[selectedProductId] ?? []
                  : [];
                const rowVariantId = Number(row.variantId);
                const filteredVariants = productVariants
                  .map((variant) => ({
                    ...variant,
                    availableStock:
                      variant.stock -
                      ((variantUsage.get(variant.id) ?? 0) - (variant.id === rowVariantId ? 1 : 0)),
                  }))
                  .filter((variant) => variant.availableStock > 0 || variant.id === rowVariantId);
                const isLoadingVariants = selectedProductId
                  ? Boolean(loadingProducts[selectedProductId])
                  : false;

                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <select
                        value={row.productId}
                        onChange={(event) =>
                          updateRow(row.id, "productId", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      >
                        <option value="">Zgjedh produktin</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <select
                          value={row.variantId}
                          onChange={(event) =>
                            updateRow(row.id, "variantId", event.target.value)
                          }
                          disabled={!row.productId || isLoadingVariants}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">
                            {!row.productId
                              ? "Zgjedh produktin"
                              : isLoadingVariants
                                ? "Duke ngarkuar variantet..."
                                : filteredVariants.length === 0
                                  ? "Nuk ka stok"
                                  : "Zgjedh variantin"}
                          </option>
                          {filteredVariants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              Nr {variant.size} | {variant.color} | stok {variant.availableStock}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.customerName}
                        onChange={(event) =>
                          updateRow(row.id, "customerName", event.target.value)
                        }
                        placeholder="Emri"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.reference}
                        onChange={(event) =>
                          updateRow(row.id, "reference", event.target.value)
                        }
                        placeholder="Instagram / tel"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price}
                        onChange={(event) =>
                          updateRow(row.id, "price", event.target.value)
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => copyRow(row.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Kopjo
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Hiq
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-3 sm:flex-row">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(5,150,105,0.24)] transition hover:bg-emerald-500"
        >
          Ruaj porosite
        </button>
        <Link
          href="/orders"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Anulo
        </Link>
      </div>
    </form>
  );
}
