import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { hasRole, requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VariantsManager } from "./variants-manager";

type ProductDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    size?: string;
    color?: string;
    stock?: string;
  }>;
};

async function deleteVariant(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const variantId = Number(formData.get("variantId"));
  const productId = Number(formData.get("productId"));

  if (!variantId || !productId) {
    return;
  }

  const variantWithOrders = await prisma.variant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      orders: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!variantWithOrders || variantWithOrders.orders.length > 0) {
    return;
  }

  await prisma.variant.delete({
    where: { id: variantId },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");
}

async function bulkDeleteVariants(formData: FormData) {
  "use server";

  await requireRole(["SUPER_ADMIN"]);

  const productId = Number(formData.get("productId"));
  const variantIdsRaw = formData.get("variantIds")?.toString();

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

  const deletableIds = variants
    .filter((variant) => variant.orders.length === 0 && variant.items.length === 0)
    .map((variant) => variant.id);

  if (deletableIds.length === 0) {
    return;
  }

  await prisma.variant.deleteMany({
    where: {
      productId,
      id: {
        in: deletableIds,
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders/new");
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

  const variantsWhere: Prisma.VariantWhereInput = {
    productId,
    ...(selectedSize ? { size: selectedSize } : {}),
    ...(selectedColor ? { color: selectedColor } : {}),
    ...(selectedStock === "in"
      ? {
          stock: {
            gt: 0,
          },
        }
      : {}),
    ...(selectedStock === "low"
      ? {
          stock: {
            gt: 0,
            lte: 5,
          },
        }
      : {}),
    ...(selectedStock === "out"
      ? {
          stock: 0,
        }
      : {}),
  };

  const [product, allVariants, filteredVariants] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        brand: true,
      },
    }),
    prisma.variant.findMany({
      where: {
        productId,
      },
      select: {
        id: true,
        size: true,
        color: true,
        sku: true,
        barcode: true,
        imagePath: true,
        stock: true,
        price: true,
      },
      orderBy: [{ size: "asc" }, { color: "asc" }],
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
        price: true,
      },
      orderBy: [{ size: "asc" }, { color: "asc" }],
    }),
  ]);

  if (!product) {
    notFound();
  }

  const totalStock = allVariants.reduce(
    (sum, variant) => sum + variant.stock,
    0,
  );
  const colors = [...new Set(allVariants.map((variant) => variant.color))];
  const sizes = [...new Set(allVariants.map((variant) => variant.size))];
  const canManageInventory = hasRole(currentUser, ["SUPER_ADMIN"]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
            <div className="min-w-0">
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-2 text-base text-slate-600">{product.brand}</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                {allVariants.length} variante
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                {totalStock} cope ne stok
              </span>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
              {canManageInventory ? (
                <Link
                  href={`/products/${product.id}/edit`}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Edito produktin
                </Link>
              ) : null}
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Kthehu te produktet
              </Link>
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
        </div>

        <div className="px-3 py-3 sm:px-4 sm:py-4">
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
              <form className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
                <select
                  name="size"
                  defaultValue={selectedSize}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="">Te gjithe numrat</option>
                  {sizes.map((size) => (
                    <option key={size} value={size}>
                      Nr {size}
                    </option>
                  ))}
                </select>

                <select
                  name="color"
                  defaultValue={selectedColor}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="">Te gjitha ngjyrat</option>
                  {colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Filtro
                  </button>
                  <Link
                    href={`/products/${product.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Reset
                  </Link>
                </div>
              </form>

              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-slate-600">
                  Po shfaqen{" "}
                  <span className="font-semibold text-slate-950">
                    {filteredVariants.length}
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
                variants={filteredVariants.map((variant) => ({
                  id: variant.id,
                  size: variant.size,
                  color: variant.color,
                  sku: variant.sku,
                  barcode: variant.barcode,
                  imagePath: variant.imagePath,
                  stock: variant.stock,
                  price: Number(variant.price),
                }))}
                deleteVariantAction={deleteVariant}
                bulkDeleteAction={bulkDeleteVariants}
              />
              {filteredVariants.length === 0 ? (
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
        </div>
      </div>
    </main>
  );
}
