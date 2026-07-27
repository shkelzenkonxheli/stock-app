"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductModelPicker } from "@/app/components/product-model-picker";
import { UploadedImage } from "@/app/components/uploaded-image";
import { getStockTone } from "@/lib/inventory";

type ProductOption = {
  id: number;
  name: string;
  brand: string;
  imagePath: string | null;
};

type WarehouseOption = {
  id: number;
  name: string;
};

type InventoryVariant = {
  id: number;
  productId: number;
  productLabel: string;
  size: string;
  color: string;
  imagePath: string | null;
  stock: number;
  price: number;
};

type IncomingStockFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  products: ProductOption[];
  warehouses: WarehouseOption[];
};

export function IncomingStockForm({
  action,
  products,
  warehouses,
}: IncomingStockFormProps) {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState(
    warehouses[0] ? String(warehouses[0].id) : "",
  );
  const [reason, setReason] = useState("INCOMING_STOCK");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  useEffect(() => {
    const parsedProductId = Number(productId);

    if (!parsedProductId) {
      setSelectedColor("");
      setVariants([]);
      setQuantities({});
      return;
    }

    let isCancelled = false;

    const loadVariants = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (warehouseId) {
          params.set("warehouseId", warehouseId);
        }
        const response = await fetch(
          `/api/products/${parsedProductId}/inventory-variants?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (!isCancelled) {
            setVariants([]);
          }
          return;
        }

        const data = (await response.json()) as InventoryVariant[];

        if (!isCancelled) {
          setSelectedColor("");
          setVariants(data);
          setQuantities({});
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadVariants();

    return () => {
      isCancelled = true;
    };
  }, [productId, warehouseId]);

  const serializedAdjustments = JSON.stringify(
    Object.entries(quantities)
      .map(([variantId, quantity]) => ({
        variantId: Number(variantId),
        quantity: Number(quantity),
      }))
      .filter((item) => item.variantId > 0 && item.quantity > 0),
  );

  const totalAdded = useMemo(
    () =>
      Object.values(quantities).reduce((sum, quantity) => {
        const parsedQuantity = Number(quantity);
        return sum + (parsedQuantity > 0 ? parsedQuantity : 0);
      }, 0),
    [quantities],
  );

  const brands = useMemo(
    () =>
      [...new Set(products.map((product) => product.brand))].sort((a, b) =>
        a.localeCompare(b, "sq", { sensitivity: "base" }),
      ),
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      selectedBrand
        ? products.filter((product) => product.brand === selectedBrand)
        : products,
    [products, selectedBrand],
  );

  const selectedProduct = useMemo(
    () => filteredProducts.find((product) => String(product.id) === productId) ?? null,
    [filteredProducts, productId],
  );

  const colorOptions = useMemo(() => {
    const grouped = new Map<
      string,
      { color: string; imagePath: string | null; totalStock: number }
    >();

    for (const variant of variants) {
      const key = variant.color.trim().toLowerCase();
      const current = grouped.get(key);

      if (current) {
        current.totalStock += variant.stock;
        if (!current.imagePath && variant.imagePath) {
          current.imagePath = variant.imagePath;
        }
      } else {
        grouped.set(key, {
          color: variant.color,
          imagePath: variant.imagePath,
          totalStock: variant.stock,
        });
      }
    }

    return [...grouped.values()].sort((a, b) =>
      a.color.localeCompare(b.color, "sq", { sensitivity: "base" }),
    );
  }, [variants]);

  const visibleVariants = useMemo(
    () =>
      selectedColor
        ? variants.filter((variant) => variant.color === selectedColor)
        : [],
    [selectedColor, variants],
  );

  const getColorDotClassName = (color: string) => {
    const normalizedColor = color.trim().toLowerCase();

    if (
      normalizedColor.includes("bardh") ||
      normalizedColor.includes("white")
    ) {
      return "border border-slate-300 bg-white";
    }
    if (normalizedColor.includes("zi") || normalizedColor.includes("black")) {
      return "bg-black";
    }
    if (normalizedColor.includes("kuq") || normalizedColor.includes("red")) {
      return "bg-red-500";
    }
    if (
      normalizedColor.includes("gjelb") ||
      normalizedColor.includes("green")
    ) {
      return "bg-emerald-500";
    }
    if (normalizedColor.includes("blu") || normalizedColor.includes("blue")) {
      return "bg-blue-500";
    }
    if (
      normalizedColor.includes("verdh") ||
      normalizedColor.includes("yellow")
    ) {
      return "bg-amber-400";
    }

    return "bg-slate-400";
  };

  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <input type="hidden" name="adjustments" value={serializedAdjustments} />

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 lg:grid-cols-5">
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Arsyeja
            </span>
            <select
              id="reason"
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
            >
              <option value="INCOMING_STOCK">Hyrje stoku</option>
              <option value="CUSTOMER_RETURN">Kthim klienti</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Depoja
            </span>
            <select
              id="warehouseId"
              name="warehouseIdSelect"
              value={warehouseId}
              onChange={(event) => {
                setWarehouseId(event.target.value);
                setProductId("");
                setSelectedColor("");
                setVariants([]);
                setQuantities({});
                setModelPickerOpen(false);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Brandi
            </span>
            <select
              id="brandFilter"
              value={selectedBrand}
              onChange={(event) => {
                const nextBrand = event.target.value;
                setSelectedBrand(nextBrand);
                setProductId("");
                setSelectedColor("");
                setVariants([]);
                setQuantities({});
                setModelPickerOpen(Boolean(nextBrand));
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
            >
              <option value="">Te gjitha brandet</option>
              {brands.map((brand, index) => (
                <option key={`${brand}-${index}`} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 lg:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Modeli dhe fotoja
            </span>
            <div className="flex min-h-[58px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              {!selectedProduct ? (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedBrand) {
                      setModelPickerOpen(true);
                    }
                  }}
                  disabled={!selectedBrand}
                  className="inline-flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <span>{!selectedBrand ? "Zgjidh brandin" : "Zgjidh modelin"}</span>
                  <span className="text-slate-400">+</span>
                </button>
              ) : (
                <div className="flex w-full flex-wrap items-center gap-2">
                  <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {selectedProduct.imagePath ? (
                      <UploadedImage
                        src={selectedProduct.imagePath}
                        alt={selectedProduct.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        IMG
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {selectedProduct.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedProduct.brand}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModelPickerOpen(true)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 transition hover:bg-slate-100"
                  >
                    Ndrysho modelin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductId("");
                      setSelectedColor("");
                      setVariants([]);
                      setQuantities({});
                      setModelPickerOpen(false);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-base leading-none text-slate-500 transition hover:bg-slate-100"
                    aria-label="Hiq modelin e zgjedhur"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <ProductModelPicker
          products={filteredProducts}
          selectedProductId={productId}
          onSelect={(value) => {
            setProductId(value);
            setSelectedColor("");
            setVariants([]);
            setQuantities({});
            setModelPickerOpen(false);
          }}
          disabled={!selectedBrand}
          placeholder="Zgjidh modelin"
          emptyLabel="Nuk ka modele per kete brand."
          displayMode="modalCards"
          open={modelPickerOpen}
          onOpenChange={setModelPickerOpen}
          hideTrigger
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Variante aktive
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {visibleVariants.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Pale qe shtohen
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
              +{totalAdded}
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
          Duke ngarkuar variantet...
        </div>
      ) : null}

      {!loading && productId && variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
          <p className="text-base font-medium text-slate-900">
            Ky produkt nuk ka ende variante
          </p>
        </div>
      ) : null}

      {variants.length > 0 ? (
        <>
          {selectedColor ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Ngjyra e zgjedhur:</span>
                <span>{selectedColor}</span>
                <button
                  type="button"
                  onClick={() => setSelectedColor("")}
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:bg-emerald-100"
                >
                  Ndrysho
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <p className="mb-4 text-sm font-semibold text-slate-900">
                Zgjidh ngjyren
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                {colorOptions.map((option) => (
                  <button
                    key={option.color}
                    type="button"
                    onClick={() => setSelectedColor(option.color)}
                    className="overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="aspect-[1/1] overflow-hidden bg-slate-100">
                      {option.imagePath ? (
                        <UploadedImage
                          src={option.imagePath}
                          alt={option.color}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                          IMG
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-2.5">
                      <p className="truncate text-[13px] font-semibold text-slate-950">
                        {option.color}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {option.totalStock} ne stok
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedColor ? (
          <>
          <div className="grid gap-4 lg:hidden">
            {visibleVariants.map((variant) => {
              const stockTone = getStockTone(variant.stock);

              return (
                <article
                  key={variant.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {variant.imagePath ? (
                          <UploadedImage
                            src={variant.imagePath}
                            alt={`${variant.productLabel} ${variant.color}`}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          Nr {variant.size} / {variant.color}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          stok {variant.stock}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex min-w-20 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold ${stockTone.badgeClassName}`}
                    >
                      {stockTone.label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label
                      htmlFor={`variant-${variant.id}`}
                      className="block text-sm font-medium text-slate-800"
                    >
                      Shto ne stok
                    </label>
                    <input
                      id={`variant-${variant.id}`}
                      type="number"
                      min="0"
                      value={quantities[variant.id] ?? ""}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [variant.id]: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left">
                  <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-4 py-3.5">Foto</th>
                    <th className="px-4 py-3.5">Numri</th>
                    <th className="px-4 py-3.5">Ngjyra</th>
                    <th className="px-4 py-3.5 text-right">Stoku aktual</th>
                    <th className="px-4 py-3.5 text-right">Shto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleVariants.map((variant) => (
                    <tr key={variant.id}>
                      <td className="px-4 py-4">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {variant.imagePath ? (
                            <UploadedImage
                              src={variant.imagePath}
                              alt={`${variant.productLabel} ${variant.color}`}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {variant.size}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${getColorDotClassName(variant.color)}`}
                          />
                          <span>{variant.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {variant.stock}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          value={quantities[variant.id] ?? ""}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [variant.id]: event.target.value,
                            }))
                          }
                          placeholder="0"
                          className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
          ) : null}

          {selectedColor && visibleVariants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
              <p className="text-base font-medium text-slate-900">
                Nuk u gjet asnje variant me kete ngjyre
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="pt-1">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
        >
          Ruaj hyrjen e stokut
        </button>
      </div>
    </form>
  );
}
