import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { hasRole, requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWarehouseStock } from "@/lib/stock-levels";
import { getActiveWarehouses, getDefaultWarehouse } from "@/lib/warehouses";
import { ProductVariantsFilters } from "./product-variants-filters";
import { VariantsManager } from "./variants-manager";

export const metadata = {
  title: "Detajet e Produktit",
};

type ProductDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    size?: string;
    color?: string;
    stock?: string;
    warehouse?: string;
    feedback?: string;
    feedbackType?: string;
  }>;
};

function buildProductDetailsHref(
  productId: number,
  options: {
    size?: string;
    color?: string;
    stock?: string;
    warehouse?: string;
    feedback?: string;
    feedbackType?: string;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.size) {
    params.set("size", options.size);
  }
  if (options.color) {
    params.set("color", options.color);
  }
  if (options.stock) {
    params.set("stock", options.stock);
  }
  if (options.warehouse) {
    params.set("warehouse", options.warehouse);
  }
  if (options.feedback) {
    params.set("feedback", options.feedback);
  }
  if (options.feedbackType) {
    params.set("feedbackType", options.feedbackType);
  }

  const query = params.toString();
  return query ? `/products/${productId}?${query}` : `/products/${productId}`;
}

async function deleteVariant(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const variantId = Number(formData.get("variantId"));
  const productId = Number(formData.get("productId"));
  const selectedSize = formData.get("size")?.toString() || "";
  const selectedColor = formData.get("color")?.toString() || "";
  const selectedStock = formData.get("stock")?.toString() || "";
  const selectedWarehouse = formData.get("warehouse")?.toString() || "";

  if (!variantId || !productId) {
    return;
  }

  const variantWithOrders = await prisma.variant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      active: true,
    },
  });

  if (!variantWithOrders || !variantWithOrders.active) {
    redirect(
      buildProductDetailsHref(productId, {
        size: selectedSize,
        color: selectedColor,
        stock: selectedStock,
        warehouse: selectedWarehouse,
        feedback: "Ky variant nuk u gjet.",
        feedbackType: "error",
      }),
    );
    return;
  }

  await prisma.variant.update({
    where: { id: variantId },
    data: {
      active: false,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");

  redirect(
    buildProductDetailsHref(productId, {
      size: selectedSize,
      color: selectedColor,
      stock: selectedStock,
      warehouse: selectedWarehouse,
        feedback: "Varianti u arkivua me sukses.",
        feedbackType: "success",
      }),
  );
}

async function bulkDeleteVariants(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const productId = Number(formData.get("productId"));
  const variantIdsRaw = formData.get("variantIds")?.toString();
  const selectedSize = formData.get("size")?.toString() || "";
  const selectedColor = formData.get("color")?.toString() || "";
  const selectedStock = formData.get("stock")?.toString() || "";
  const selectedWarehouse = formData.get("warehouse")?.toString() || "";

  if (!productId || !variantIdsRaw) {
    return;
  }

  let parsedVariantIds: unknown;

  try {
    parsedVariantIds = JSON.parse(variantIdsRaw);
  } catch {
    return;
  }

  if (!Array.isArray(parsedVariantIds) || parsedVariantIds.length === 0) {
    return;
  }

  const variantIds = parsedVariantIds
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (variantIds.length === 0) {
    return;
  }

  const variants = await prisma.variant.findMany({
    where: {
      productId,
      active: true,
      id: {
        in: variantIds,
      },
    },
    select: {
      id: true,
      orders: {
        select: {
          id: true,
        },
        take: 1,
      },
      items: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (variants.length === 0) {
    redirect(
      buildProductDetailsHref(productId, {
        size: selectedSize,
        color: selectedColor,
        stock: selectedStock,
        warehouse: selectedWarehouse,
        feedback: "Asnje variant nuk u gjet per fshirje.",
        feedbackType: "error",
      }),
    );
    return;
  }

  await prisma.variant.updateMany({
    where: {
      productId,
      id: {
        in: variants.map((variant) => variant.id),
      },
    },
    data: {
      active: false,
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");

  redirect(
    buildProductDetailsHref(productId, {
      size: selectedSize,
      color: selectedColor,
      stock: selectedStock,
      warehouse: selectedWarehouse,
      feedback: `${variants.length} variante u arkivuan me sukses.`,
      feedbackType: "success",
    }),
  );
}

export default async function ProductDetailsPage({
  params,
  searchParams,
}: ProductDetailsPageProps) {
  const currentUser = await requireUser();
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const productId = Number(id);

  if (Number.isNaN(productId)) {
    notFound();
  }

  const selectedSize = resolvedSearchParams?.size?.trim() || "";
  const selectedColor = resolvedSearchParams?.color?.trim() || "";
  const selectedStock = resolvedSearchParams?.stock?.trim() || "";
  const selectedWarehouse = resolvedSearchParams?.warehouse?.trim() || "";
  const selectedWarehouseId = Number(selectedWarehouse) || null;
  const feedbackMessage = resolvedSearchParams?.feedback?.trim() || "";
  const feedbackType = resolvedSearchParams?.feedbackType?.trim() || "";

  const variantsWhere: Prisma.VariantWhereInput = {
    productId,
    active: true,
    ...(selectedSize ? { size: selectedSize } : {}),
    ...(selectedColor ? { color: selectedColor } : {}),
    ...(!selectedWarehouseId && selectedStock === "in"
      ? {
          stock: {
            gt: 0,
          },
        }
      : {}),
    ...(!selectedWarehouseId && selectedStock === "low"
      ? {
          stock: {
            gt: 0,
            lte: 5,
          },
        }
      : {}),
    ...(!selectedWarehouseId && selectedStock === "out"
      ? {
          stock: 0,
        }
      : {}),
  };

  const selectedWarehouseHidden = resolvedSearchParams?.warehouse?.trim() || "";
  const defaultWarehouse = await getDefaultWarehouse();
  const defaultWarehouseId = defaultWarehouse?.id ?? null;

  const [product, allVariants, filteredVariants, warehouses] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        brand: true,
        createdAt: true,
        variants: {
          select: {
            stockMovements: {
              select: {
                id: true,
                quantity: true,
                reason: true,
                createdAt: true,
                variant: {
                  select: {
                    size: true,
                    color: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 4,
            },
          },
        },
      },
    }),
    prisma.variant.findMany({
      where: {
        productId,
        active: true,
      },
      select: {
        id: true,
        size: true,
        color: true,
        sku: true,
        barcode: true,
        imagePath: true,
        stock: true,
        ...(selectedWarehouseId
          ? {
              stockLevels: {
                where: { warehouseId: selectedWarehouseId },
                select: {
                  warehouseId: true,
                  quantity: true,
                },
              },
            }
          : {}),
        price: true,
      },
      orderBy: [{ color: "asc" }, { size: "asc" }],
    }),
    prisma.variant.findMany({
      where: variantsWhere,
      select: {
        id: true,
        size: true,
        color: true,
        sku: true,
        barcode: true,
        imagePath: true,
        stock: true,
        ...(selectedWarehouseId
          ? {
              stockLevels: {
                where: { warehouseId: selectedWarehouseId },
                select: {
                  warehouseId: true,
                  quantity: true,
                },
              },
            }
          : {}),
        price: true,
      },
      orderBy: [{ color: "asc" }, { size: "asc" }],
    }),
    getActiveWarehouses(),
  ]);

  if (!product) {
    notFound();
  }

  const totalStock = allVariants.reduce(
    (sum, variant) =>
      sum +
      resolveWarehouseStock(
        Array.isArray(variant.stockLevels) ? variant.stockLevels : undefined,
        variant.stock,
        selectedWarehouseId,
        defaultWarehouseId,
      ),
    0,
  );
  const colors = [...new Set(allVariants.map((variant) => variant.color))];
  const sizes = [...new Set(allVariants.map((variant) => variant.size))];
  const visibleVariants = selectedWarehouseId
    ? filteredVariants.filter((variant) => {
        const warehouseStock = resolveWarehouseStock(
          Array.isArray(variant.stockLevels) ? variant.stockLevels : undefined,
          variant.stock,
          selectedWarehouseId,
          defaultWarehouseId,
        );
        if (selectedStock === "in") return warehouseStock > 0;
        if (selectedStock === "low") {
          return warehouseStock > 0 && warehouseStock <= 5;
        }
        if (selectedStock === "out") return false;
        return warehouseStock > 0;
      })
    : filteredVariants.filter((variant) => {
        if (selectedStock === "out") return false;

        return variant.stock > 0;
      });
  const canManageInventory = hasRole(currentUser, ["SUPER_ADMIN"]);
  const latestMovements = product.variants
    .flatMap((variant) => variant.stockMovements)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4);
  const weeklyIncoming = latestMovements
    .filter((movement) => movement.reason === "INCOMING_STOCK")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const returnCount = latestMovements
    .filter((movement) => movement.reason === "CUSTOMER_RETURN")
    .reduce((sum, movement) => sum + movement.quantity, 0);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="space-y-5 rounded-[30px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Inventory / Produkte
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-2 text-base text-slate-600">{product.brand}</p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                Kthehu te produktet
              </Link>
              {canManageInventory ? (
                <Link
                  href={`/products/${product.id}/edit`}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                >
                  Edito produktin
                </Link>
              ) : null}
              {canManageInventory ? (
                <Link
                  href={`/products/${product.id}/variants/new`}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                >
                  + Shto Variant
                </Link>
              ) : null}
            </div>
          </div>

        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white px-3 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-4 sm:py-5">
          {allVariants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
              <p className="text-base font-medium text-slate-900">
                Ky produkt ende nuk ka variante
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Shto variantin e pare per te filluar menaxhimin e stokut.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    feedbackType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : feedbackType === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {feedbackMessage}
                </div>
              ) : null}

              <ProductVariantsFilters
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                selectedStock={selectedStock}
                selectedWarehouse={selectedWarehouse}
                sizes={sizes}
                colors={colors}
                warehouses={warehouses.map((warehouse) => ({
                  id: warehouse.id,
                  name: warehouse.name,
                }))}
              />

              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-slate-600">
                  Po shfaqen{" "}
                  <span className="font-semibold text-slate-950">
                    {visibleVariants.length}
                  </span>{" "}
                  nga{" "}
                  <span className="font-semibold text-slate-950">
                    {allVariants.length}
                  </span>{" "}
                  variante
                </p>
              </div>

              <VariantsManager
                productId={product.id}
                productName={product.name}
                canManageInventory={canManageInventory}
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                selectedStock={selectedStock}
                selectedWarehouse={selectedWarehouseHidden}
                variants={visibleVariants.map((variant) => ({
                  id: variant.id,
                  size: variant.size,
                  color: variant.color,
                  sku: variant.sku,
                  barcode: variant.barcode,
                  imagePath: variant.imagePath,
                  stock: resolveWarehouseStock(
                    Array.isArray(variant.stockLevels) ? variant.stockLevels : undefined,
                    variant.stock,
                    selectedWarehouseId,
                    defaultWarehouseId,
                  ),
                  price: Number(variant.price),
                }))}
                deleteVariantAction={deleteVariant}
                bulkDeleteAction={bulkDeleteVariants}
              />
              {visibleVariants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
                  <p className="text-base font-medium text-slate-900">
                    Nuk u gjet asnje variant me keto filtra
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Ndrysho filtrat ose bej reset per t&apos;i pare te gjitha.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="border-l-[3px] border-slate-950 pl-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Pershkrimi i Produktit
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                {product.name} nga {product.brand} eshte organizuar ne katalog
                me variante te ndara sipas ngjyres dhe numrit, qe ta beje
                menaxhimin e stokut me te qarte dhe me te shpejte. Aktualisht
                ky produkt ka {allVariants.length} variante aktive dhe{" "}
                {totalStock} njesi te disponueshme ne inventar.
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Brendi
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {product.brand}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Struktura
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {sizes.length} numra / {colors.length} ngjyra
                </p>
              </div>
            </div>
          </article>

          <aside className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Trendi i Inventarit
            </h2>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">
                  Hyrje te fundit
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  +{weeklyIncoming}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">
                  Kthime
                </span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-600">
                  {returnCount}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Aktiviteti i fundit
              </p>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {latestMovements.length > 0 ? (
                  latestMovements.map((movement) => (
                    <li key={movement.id} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span>
                        {movement.reason === "CUSTOMER_RETURN"
                          ? "Kthim klienti"
                          : "Hyrje stoku"}{" "}
                        ne {movement.variant.color} / {movement.variant.size} (
                        {movement.quantity} cope)
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">Ende nuk ka levizje stoku.</li>
                )}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

