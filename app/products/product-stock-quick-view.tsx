"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadedImage } from "@/app/components/uploaded-image";
import { LOW_STOCK_THRESHOLD, getStockTone } from "@/lib/inventory";

type ProductQuickVariant = {
  id: number;
  size: string;
  color: string;
  imagePath: string | null;
  stock: number;
  price?: number;
};

type ProductStockQuickViewProps = {
  productId: number;
  productName: string;
  productBrand: string;
  imagePath: string | null;
  variants: ProductQuickVariant[];
  className?: string;
  showImageButton?: boolean;
  canAdjustStock?: boolean;
};

type StockReason = "INCOMING_STOCK" | "CUSTOMER_RETURN";

function getColorSwatchClass(color: string) {
  const normalized = color.trim().toLowerCase();

  if (normalized.includes("zez") || normalized.includes("black")) {
    return "bg-black";
  }
  if (normalized.includes("bardh") || normalized.includes("white")) {
    return "border border-slate-300 bg-white";
  }
  if (normalized.includes("kuq") || normalized.includes("red")) {
    return "bg-red-500";
  }
  if (normalized.includes("gjelb") || normalized.includes("green")) {
    return "bg-emerald-600";
  }
  if (normalized.includes("blu") || normalized.includes("blue")) {
    return "bg-blue-600";
  }
  if (normalized.includes("verdh") || normalized.includes("yellow")) {
    return "bg-yellow-400";
  }

  return "bg-slate-300";
}

function modalCardClass() {
  return "w-full rounded-[28px] bg-white p-5 shadow-2xl";
}

function IconPlus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M10 4.167v11.666M4.167 10h11.666"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M10 3.75 3.75 7.5 10 11.25 16.25 7.5 10 3.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5.833 10 10 12.5 14.167 10M5.833 13 10 15.5 14.167 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4.375 6.25 10 3.75l5.625 2.5v7.5L10 16.25l-5.625-2.5v-7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M4.375 6.25 10 8.75m0 0 5.625-2.5M10 8.75v7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="m13.958 4.375 1.667 1.667M5.417 14.583l2.166-.416 7.5-7.5a1.179 1.179 0 0 0 0-1.667l-.833-.833a1.179 1.179 0 0 0-1.667 0l-7.5 7.5-.416 2.166Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="m5 10.417 3.125 3.125L15 6.667"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProductStockQuickView({
  productId,
  productName,
  productBrand,
  imagePath,
  variants,
  className = "",
  showImageButton = true,
  canAdjustStock = false,
}: ProductStockQuickViewProps) {
  const [showStock, setShowStock] = useState(false);
  const [variantsState, setVariantsState] = useState(variants);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [stockEditorColor, setStockEditorColor] = useState<string | null>(null);
  const [stockInputs, setStockInputs] = useState<Record<number, string>>({});
  const [stockReason, setStockReason] = useState<StockReason>("INCOMING_STOCK");
  const [stockError, setStockError] = useState<string | null>(null);
  const [savingStock, setSavingStock] = useState(false);

  const [editStockColor, setEditStockColor] = useState<string | null>(null);
  const [editStockInputs, setEditStockInputs] = useState<Record<number, string>>({});
  const [editStockError, setEditStockError] = useState<string | null>(null);
  const [savingEditStock, setSavingEditStock] = useState(false);

  const [numberEditorColor, setNumberEditorColor] = useState<string | null>(null);
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingNumber, setCreatingNumber] = useState(false);

  const [showVariantCreator, setShowVariantCreator] = useState(false);
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantError, setVariantError] = useState<string | null>(null);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [variantImageFile, setVariantImageFile] = useState<File | null>(null);
  const [variantImagePreview, setVariantImagePreview] = useState<string | null>(null);

  const groupedVariants = useMemo(() => {
    const sorted = [...variantsState].sort(
      (a, b) =>
        a.color.localeCompare(b.color, "sq", { sensitivity: "base" }) ||
        a.size.localeCompare(b.size, "sq", {
          numeric: true,
          sensitivity: "base",
        }),
    );

    return sorted.reduce(
      (groups, variant) => {
        const current = groups.get(variant.color) ?? [];
        current.push(variant);
        groups.set(variant.color, current);
        return groups;
      },
      new Map<string, ProductQuickVariant[]>(),
    );
  }, [variantsState]);

  const totalStock = variantsState.reduce((sum, variant) => sum + variant.stock, 0);
  const stockTone = getStockTone(totalStock);

  const colorEditorVariants = stockEditorColor
    ? groupedVariants.get(stockEditorColor) ?? []
    : [];
  const colorVariantsForEdit = editStockColor
    ? groupedVariants.get(editStockColor) ?? []
    : [];
  const colorVariantsForNewNumber = numberEditorColor
    ? groupedVariants.get(numberEditorColor) ?? []
    : [];

  const totalAddedForColor = colorEditorVariants.reduce((sum, variant) => {
    const parsed = Number(stockInputs[variant.id] ?? 0);
    return sum + (parsed > 0 ? parsed : 0);
  }, 0);

  const availableColors = useMemo(
    () => Array.from(groupedVariants.keys()).sort((a, b) => a.localeCompare(b, "sq")),
    [groupedVariants],
  );
  const normalizedVariantColor = variantColor.trim().toLowerCase();
  const matchedVariantColor =
    availableColors.find(
      (color) => color.trim().toLowerCase() === normalizedVariantColor,
    ) ?? null;
  const requiresVariantPrice = !matchedVariantColor && variantColor.trim().length > 0;

  useEffect(() => {
    if (!successToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessToast(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [successToast]);

  useEffect(() => {
    return () => {
      if (variantImagePreview) {
        URL.revokeObjectURL(variantImagePreview);
      }
    };
  }, [variantImagePreview]);

  async function saveQuickStock() {
    const updates = Object.entries(stockInputs)
      .map(([variantId, quantity]) => ({
        variantId: Number(variantId),
        quantity: Number(quantity),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.variantId) &&
          item.variantId > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      );

    if (updates.length === 0) {
      setStockError("Shkruaj te pakten nje sasi per ta ruajtur.");
      return;
    }

    setSavingStock(true);
    setStockError(null);

    try {
      const response = await fetch("/api/variants/quick-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          reason: stockReason,
          updates,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setStockError(data?.error ?? "Ruajtja e stokut deshtoi.");
        return;
      }

      const updateMap = new Map(
        updates.map((item) => [item.variantId, item.quantity]),
      );

      setVariantsState((current) =>
        current.map((variant) => ({
          ...variant,
          stock: variant.stock + (updateMap.get(variant.id) ?? 0),
        })),
      );
      setStockInputs({});
      setStockEditorColor(null);
      setSuccessToast("Stoku u perditesua.");
    } catch {
      setStockError("Ruajtja e stokut deshtoi.");
    } finally {
      setSavingStock(false);
    }
  }

  async function saveEditedStock() {
    const updates = colorVariantsForEdit
      .map((variant) => ({
        variantId: variant.id,
        currentStock: variant.stock,
        nextStock: Number(editStockInputs[variant.id]),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.nextStock) &&
          item.nextStock >= 0 &&
          item.nextStock !== item.currentStock,
      );

    if (updates.length === 0) {
      setEditStockError("Ndrysho te pakten nje stok per ta ruajtur.");
      return;
    }

    setSavingEditStock(true);
    setEditStockError(null);

    try {
      const responses = await Promise.all(
        updates.map((item) =>
          fetch("/api/variants/quick-set-stock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId,
              variantId: item.variantId,
              stock: item.nextStock,
            }),
          }),
        ),
      );

      const failed = responses.find((response) => !response.ok);

      if (failed) {
        const data = (await failed.json().catch(() => null)) as
          | { error?: string }
          | null;
        setEditStockError(data?.error ?? "Ndryshimi i stokut deshtoi.");
        return;
      }

      const updateMap = new Map(
        updates.map((item) => [item.variantId, item.nextStock]),
      );

      setVariantsState((current) =>
        current.map((variant) => ({
          ...variant,
          stock: updateMap.get(variant.id) ?? variant.stock,
        })),
      );
      setEditStockColor(null);
      setEditStockInputs({});
      setSuccessToast("Stoku u ndryshua.");
    } catch {
      setEditStockError("Ndryshimi i stokut deshtoi.");
    } finally {
      setSavingEditStock(false);
    }
  }

  async function saveNewNumber() {
    const size = newSize.trim();
    const stock = Number(newStock);

    if (!numberEditorColor || !size || !Number.isInteger(stock) || stock < 0) {
      setCreateError("Ploteso numrin dhe sasine.");
      return;
    }

    setCreatingNumber(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/variants/quick-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          color: numberEditorColor,
          size,
          stock,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; variant?: ProductQuickVariant }
        | null;

      if (!response.ok || !data?.variant) {
        setCreateError(data?.error ?? "Krijimi i numrit deshtoi.");
        return;
      }

      setVariantsState((current) => [...current, data.variant]);
      setNumberEditorColor(null);
      setNewSize("");
      setNewStock("");
      setSuccessToast("Numri i ri u shtua.");
    } catch {
      setCreateError("Krijimi i numrit deshtoi.");
    } finally {
      setCreatingNumber(false);
    }
  }

  async function saveNewVariant() {
    const color = variantColor.trim();
    const size = variantSize.trim();
    const stock = Number(variantStock);

    if (!color || !size || !Number.isInteger(stock) || stock < 0) {
      setVariantError("Ploteso ngjyren, numrin dhe sasine.");
      return;
    }

    setCreatingVariant(true);
    setVariantError(null);

    try {
      const formData = new FormData();
      formData.append("productId", String(productId));
      formData.append("color", color);
      formData.append("size", size);
      formData.append("stock", String(stock));

      if (requiresVariantPrice) {
        const price = Number(variantPrice);
        if (Number.isNaN(price) || price < 0) {
          setVariantError("Jep cmimin per ngjyre te re.");
          setCreatingVariant(false);
          return;
        }
        formData.append("price", String(price));
      }

      if (variantImageFile) {
        formData.append("image", variantImageFile);
      }

      const response = await fetch("/api/variants/quick-create", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; variant?: ProductQuickVariant }
        | null;

      if (!response.ok || !data?.variant) {
        setVariantError(data?.error ?? "Krijimi i variantit deshtoi.");
        return;
      }

      setVariantsState((current) => [...current, data.variant]);
      setShowVariantCreator(false);
      setVariantColor("");
      setVariantSize("");
      setVariantStock("");
      setVariantPrice("");
      setVariantImageFile(null);
      if (variantImagePreview) {
        URL.revokeObjectURL(variantImagePreview);
      }
      setVariantImagePreview(null);
      setSuccessToast("Varianti i ri u shtua.");
    } catch {
      setVariantError("Krijimi i variantit deshtoi.");
    } finally {
      setCreatingVariant(false);
    }
  }

  return (
    <>
      {showImageButton ? (
        <button
          type="button"
          onClick={() =>
            imagePath
              ? setPreviewImage({
                  src: imagePath,
                  alt: productName,
                })
              : undefined
          }
          className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className} ${
            imagePath ? "transition hover:border-slate-300" : ""
          }`}
          title={imagePath ? "Hap foton" : "Pa foto"}
        >
          {imagePath ? (
            <UploadedImage
              src={imagePath}
              alt={productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              IMG
            </div>
          )}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setShowStock(true)}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Stoku
      </button>

      {successToast ? (
        <div className="fixed bottom-4 right-4 z-[120] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          {successToast}
        </div>
      ) : null}

      {showStock ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => setShowStock(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {imagePath ? (
                    <UploadedImage
                      src={imagePath}
                      alt={productName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-xl font-semibold text-slate-950">
                    {productName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{productBrand}</p>
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stockTone.badgeClassName}`}
                  >
                    {totalStock} cope - {stockTone.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canAdjustStock ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowVariantCreator(true);
                      setVariantColor("");
                      setVariantSize("");
                      setVariantStock("");
                      setVariantPrice("");
                      setVariantImageFile(null);
                      if (variantImagePreview) {
                        URL.revokeObjectURL(variantImagePreview);
                      }
                      setVariantImagePreview(null);
                      setVariantError(null);
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <IconPlus />
                    Shto variant
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowStock(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Mbyll"
                >
                  x
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
              {Array.from(groupedVariants.entries()).map(([color, colorVariants]) => {
                const colorImage =
                  colorVariants.find((variant) => variant.imagePath)?.imagePath ??
                  null;
                const colorStockTotal = colorVariants.reduce(
                  (sum, variant) => sum + variant.stock,
                  0,
                );

                return (
                  <section
                    key={color}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            colorImage
                              ? setPreviewImage({
                                  src: colorImage,
                                  alt: `${productName} ${color}`,
                                })
                              : undefined
                          }
                          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          title={colorImage ? "Hap foton" : "Pa foto"}
                        >
                          {colorImage ? (
                            <UploadedImage
                              src={colorImage}
                              alt={`${productName} ${color}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              IMG
                            </span>
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-3 w-3 rounded-full ${getColorSwatchClass(color)}`}
                            />
                            <h3 className="text-base font-semibold text-slate-900">
                              {color}
                            </h3>
                          </div>
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                            {colorStockTotal} cope ne total
                          </p>
                        </div>
                      </div>

                      {canAdjustStock ? (
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNumberEditorColor(color);
                              setNewSize("");
                              setNewStock("");
                              setCreateError(null);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <IconLayers />
                            Shto numer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStockEditorColor(color);
                              setStockInputs({});
                              setStockReason("INCOMING_STOCK");
                              setStockError(null);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <IconBox />
                            Shto sasi
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditStockColor(color);
                              setEditStockInputs(
                                Object.fromEntries(
                                  colorVariants.map((variant) => [
                                    variant.id,
                                    String(variant.stock),
                                  ]),
                                ),
                              );
                              setEditStockError(null);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <IconPencil />
                            Edito stokun
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {colorVariants.map((variant) => {
                        const tone =
                          variant.stock > 0 && variant.stock <= LOW_STOCK_THRESHOLD
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : variant.stock > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-500";

                        return (
                          <div
                            key={`${color}-${variant.size}-${variant.id}`}
                            className={`min-w-[92px] rounded-2xl border px-3 py-2.5 ${tone}`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                              Nr {variant.size}
                            </p>
                            <p className="mt-1 text-xs font-medium">
                              {variant.stock} ne stok
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {previewImage ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/75 text-white transition hover:bg-slate-950"
              aria-label="Mbyll foton"
            >
              x
            </button>
            <div className="overflow-hidden rounded-[22px]">
              <UploadedImage
                src={previewImage.src}
                alt={previewImage.alt}
                className="h-auto max-h-[80vh] w-full object-contain bg-slate-50"
              />
            </div>
          </div>
        </div>
      ) : null}

      {stockEditorColor ? (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/65 p-4"
          onClick={() => {
            if (!savingStock) {
              setStockEditorColor(null);
              setStockError(null);
            }
          }}
        >
          <div className={`${modalCardClass()} max-w-xl`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Shto sasi - {stockEditorColor}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Zgjidh arsyen dhe vendos sa pale po shtohen per secilin numer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!savingStock) {
                    setStockEditorColor(null);
                    setStockError(null);
                  }
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Mbyll"
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-3 grid gap-3 rounded-2xl bg-white px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Ngjyra
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span
                      className={`inline-flex h-3 w-3 rounded-full ${getColorSwatchClass(
                        stockEditorColor,
                      )}`}
                    />
                    {stockEditorColor}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Po shtohen
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    +{totalAddedForColor}
                  </p>
                </div>
              </div>

              <label className="mb-3 block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Arsyeja
                </span>
                <select
                  value={stockReason}
                  onChange={(event) => setStockReason(event.target.value as StockReason)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="INCOMING_STOCK">Hyrje stoku</option>
                  <option value="CUSTOMER_RETURN">Kthim klienti</option>
                </select>
              </label>

              <div className="space-y-3">
                {colorEditorVariants.map((variant) => (
                  <div
                    key={`edit-${variant.id}-${variant.size}`}
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          Nr {variant.size}
                        </p>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {variant.stock} ne stok
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <span className="text-sm font-semibold text-slate-400">+</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={stockInputs[variant.id] ?? ""}
                        onChange={(event) =>
                          setStockInputs((current) => ({
                            ...current,
                            [variant.id]: event.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 sm:w-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {stockError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {stockError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!savingStock) {
                    setStockEditorColor(null);
                    setStockError(null);
                  }
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={savingStock}
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={() => void saveQuickStock()}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingStock}
              >
                {!savingStock ? <IconCheck /> : null}
                {savingStock ? "Duke ruajtur..." : "Ruaj"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editStockColor ? (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/65 p-4"
          onClick={() => {
            if (!savingEditStock) {
              setEditStockColor(null);
              setEditStockError(null);
            }
          }}
        >
          <div className={`${modalCardClass()} max-w-xl`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Edito stokun - {editStockColor}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Vendos stokun final per secilin numer te kesaj ngjyre.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!savingEditStock) {
                    setEditStockColor(null);
                    setEditStockError(null);
                  }
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Mbyll"
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-3">
              <div className="space-y-3">
                {colorVariantsForEdit.map((variant) => (
                  <div
                    key={`set-${variant.id}`}
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          Nr {variant.size}
                        </p>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          aktual: {variant.stock}
                        </span>
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={editStockInputs[variant.id] ?? ""}
                      onChange={(event) =>
                        setEditStockInputs((current) => ({
                          ...current,
                          [variant.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 sm:w-24"
                    />
                  </div>
                ))}
              </div>
            </div>

            {editStockError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {editStockError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!savingEditStock) {
                    setEditStockColor(null);
                    setEditStockError(null);
                  }
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={savingEditStock}
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={() => void saveEditedStock()}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingEditStock}
              >
                {!savingEditStock ? <IconCheck /> : null}
                {savingEditStock ? "Duke ruajtur..." : "Ruaj stokun"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {numberEditorColor ? (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/65 p-4"
          onClick={() => {
            if (!creatingNumber) {
              setNumberEditorColor(null);
              setCreateError(null);
            }
          }}
        >
          <div className={`${modalCardClass()} max-w-xl`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Shto numer - {numberEditorColor}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Krijo numer te ri brenda kesaj ngjyre. Cmimi merret automatikisht.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!creatingNumber) {
                    setNumberEditorColor(null);
                    setCreateError(null);
                  }
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Mbyll"
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Ngjyra
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span
                      className={`inline-flex h-3 w-3 rounded-full ${getColorSwatchClass(
                        numberEditorColor,
                      )}`}
                    />
                    {numberEditorColor}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Variante ekzistuese
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {colorVariantsForNewNumber.length}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Numri
                  </span>
                  <input
                    type="text"
                    value={newSize}
                    onChange={(event) => setNewSize(event.target.value)}
                    placeholder="44"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Sasia
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={(event) => setNewStock(event.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                  />
                </label>
              </div>

              {colorVariantsForNewNumber.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Numrat ekzistues
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {colorVariantsForNewNumber.map((variant) => (
                      <span
                        key={`existing-${variant.id}`}
                        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        Nr {variant.size}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {createError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {createError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!creatingNumber) {
                    setNumberEditorColor(null);
                    setCreateError(null);
                  }
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={creatingNumber}
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={() => void saveNewNumber()}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={creatingNumber}
              >
                {!creatingNumber ? <IconCheck /> : null}
                {creatingNumber ? "Duke ruajtur..." : "Ruaj numerin"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showVariantCreator ? (
        <div
          className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/65 p-4"
          onClick={() => {
            if (!creatingVariant) {
              setShowVariantCreator(false);
              setVariantError(null);
            }
          }}
        >
          <div className={`${modalCardClass()} max-w-2xl`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Shto variant
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Krijo variant te ri per kete model. Nese ngjyra ekziston, cmimi merret automatikisht.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!creatingVariant) {
                    setShowVariantCreator(false);
                    setVariantError(null);
                    setVariantImageFile(null);
                    if (variantImagePreview) {
                      URL.revokeObjectURL(variantImagePreview);
                    }
                    setVariantImagePreview(null);
                  }
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Mbyll"
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Ngjyra
                  </span>
                  <input
                    type="text"
                    list="quick-variant-colors"
                    value={variantColor}
                    onChange={(event) => setVariantColor(event.target.value)}
                    placeholder="Blue"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                  />
                  <datalist id="quick-variant-colors">
                    {availableColors.map((color) => (
                      <option key={color} value={color} />
                    ))}
                  </datalist>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Numri
                  </span>
                  <input
                    type="text"
                    value={variantSize}
                    onChange={(event) => setVariantSize(event.target.value)}
                    placeholder="44"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Sasia
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={variantStock}
                    onChange={(event) => setVariantStock(event.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                {requiresVariantPrice ? (
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Cmimi
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variantPrice}
                      onChange={(event) => setVariantPrice(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                    />
                  </label>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {matchedVariantColor
                      ? `Cmimi do te merret nga ngjyra ${matchedVariantColor}.`
                      : "Zgjidh ose shkruaj ngjyren per te vazhduar."}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Foto opsionale
                </label>
                <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-start">
                  <div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;

                        if (variantImagePreview) {
                          URL.revokeObjectURL(variantImagePreview);
                        }

                        if (!file) {
                          setVariantImageFile(null);
                          setVariantImagePreview(null);
                          return;
                        }

                        setVariantImageFile(file);
                        setVariantImagePreview(URL.createObjectURL(file));
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2.5 file:font-medium file:text-white hover:file:bg-slate-800"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Nese nuk zgjedh foto, merret fotoja ekzistuese e ngjyres kur ka.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      variantImagePreview
                        ? setPreviewImage({
                            src: variantImagePreview,
                            alt: `${productName} ${variantColor || "variant"}`,
                          })
                        : undefined
                    }
                    className="flex h-[120px] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    title={variantImagePreview ? "Hap foton" : "Pa foto"}
                  >
                    {variantImagePreview ? (
                      <UploadedImage
                        src={variantImagePreview}
                        alt={`${productName} ${variantColor || "variant"}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        IMG
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {availableColors.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Ngjyrat ekzistuese
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={`color-${color}`}
                        type="button"
                        onClick={() => setVariantColor(color)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        <span
                          className={`inline-flex h-2.5 w-2.5 rounded-full ${getColorSwatchClass(
                            color,
                          )}`}
                        />
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {variantError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {variantError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!creatingVariant) {
                    setShowVariantCreator(false);
                    setVariantError(null);
                    setVariantImageFile(null);
                    if (variantImagePreview) {
                      URL.revokeObjectURL(variantImagePreview);
                    }
                    setVariantImagePreview(null);
                  }
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={creatingVariant}
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={() => void saveNewVariant()}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={creatingVariant}
              >
                {!creatingVariant ? <IconCheck /> : null}
                {creatingVariant ? "Duke ruajtur..." : "Ruaj variantin"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
