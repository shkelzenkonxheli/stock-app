import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { hasRole, requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{hint}</p>
    </div>
  );
}

type SectionCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

function SectionCard({
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

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

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
    },
  });

  if (!product) {
    notFound();
  }

  const totalStock = product.variants.reduce(
    (sum, variant) => sum + variant.stock,
    0,
  );
  const colors = [...new Set(product.variants.map((variant) => variant.color))];
  const sizes = [...new Set(product.variants.map((variant) => variant.size))];
  const priceValues = product.variants.map((variant) => Number(variant.price));
  const lowestPrice =
    priceValues.length > 0 ? Math.min(...priceValues).toFixed(2) : null;
  const highestPrice =
    priceValues.length > 0 ? Math.max(...priceValues).toFixed(2) : null;
  const selectedSize = resolvedSearchParams?.size?.trim() || "";
  const selectedColor = resolvedSearchParams?.color?.trim() || "";
  const selectedStock = resolvedSearchParams?.stock?.trim() || "";
  const filteredVariants = product.variants.filter((variant) => {
    const matchesSize = !selectedSize || variant.size === selectedSize;
    const matchesColor = !selectedColor || variant.color === selectedColor;
    const matchesStock =
      !selectedStock ||
      (selectedStock === "in" && variant.stock > 0) ||
      (selectedStock === "low" && variant.stock > 0 && variant.stock <= 5) ||
      (selectedStock === "out" && variant.stock === 0);

    return matchesSize && matchesColor && matchesStock;
  });
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
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  {product.variants.length} variante
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  {totalStock} cope ne stok
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatCard
            label="Numrat aktiv"
            value={sizes.length > 0 ? sizes.join(", ") : "-"}
            hint={`${sizes.length} numra te regjistruar per kete model`}
          />
          <StatCard
            label="Ngjyrat aktive"
            value={colors.length > 0 ? colors.join(", ") : "-"}
            hint={`${colors.length} ngjyra te lidhura me kete model`}
          />
        </div>

        <div className="px-3 py-3 sm:px-4 sm:py-4">
          {product.variants.length === 0 ? (
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
                    {product.variants.length}
                  </span>{" "}
                  variante
                </p>
              </div>

              <div className="grid gap-4 lg:hidden">
                {filteredVariants.map((variant) => (
                  <article
                    key={variant.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex min-w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
                          {variant.size}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{variant.color}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Variant #{variant.id}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex min-w-16 items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                        {variant.stock}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-medium text-slate-600">Cmimi</span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {Number(variant.price).toFixed(2)} EUR
                      </span>
                    </div>

                    {canManageInventory ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          href={`/products/${product.id}/variants/${variant.id}/edit`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Edito
                        </Link>
                        <form action={deleteVariant}>
                          <input type="hidden" name="variantId" value={variant.id} />
                          <input type="hidden" name="productId" value={product.id} />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                          >
                            Fshi
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3.5 sm:px-5">Numri</th>
                        <th className="px-4 py-3.5 sm:px-5">Ngjyra</th>
                        <th className="px-4 py-3.5 text-right sm:px-5">
                          Stoku
                        </th>
                        <th className="px-4 py-3.5 text-right sm:px-5">
                          Cmimi
                        </th>
                        {canManageInventory ? (
                          <th className="px-4 py-3.5 text-right sm:px-5">
                            Veprime
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredVariants.map((variant) => (
                        <tr
                          key={variant.id}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4 sm:px-5">
                            <span className="inline-flex min-w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
                              {variant.size}
                            </span>
                          </td>
                          <td className="px-4 py-4 sm:px-5">
                            <div className="flex items-center gap-3">
                              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                              <span className="font-medium text-slate-800">
                                {variant.color}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right sm:px-5">
                            <span className="inline-flex min-w-16 items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                              {variant.stock}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right sm:px-5">
                            <span className="font-semibold tabular-nums text-slate-900">
                              {Number(variant.price).toFixed(2)} EUR
                            </span>
                          </td>
                          {canManageInventory ? (
                            <td className="px-4 py-4 text-right sm:px-5">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/products/${product.id}/variants/${variant.id}/edit`}
                                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                                >
                                  Edito
                                </Link>
                                <form action={deleteVariant}>
                                  <input
                                    type="hidden"
                                    name="variantId"
                                    value={variant.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="productId"
                                    value={product.id}
                                  />
                                  <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                                  >
                                    Fshi
                                  </button>
                                </form>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
