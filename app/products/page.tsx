import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { ConfirmActionForm } from "@/app/components/confirm-action-form";
import { hasRole, requireUser } from "@/lib/auth";
import { LOW_STOCK_THRESHOLD, getStockTone } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { ProductsFilters } from "./products-filters";

const PAGE_SIZE = 20;

type ProductsPageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
};

function buildProductsPageHref(page: number, q: string) {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (q) {
    params.set("q", q);
  }

  return `/products?${params.toString()}`;
}

async function deleteProduct(formData: FormData) {
  "use server";

  const productId = Number(formData.get("productId"));

  if (!productId) {
    return;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      _count: {
        select: {
          variants: true,
        },
      },
    },
  });

  if (!product || product._count.variants > 0) {
    return;
  }

  await prisma.product.delete({
    where: { id: productId },
  });

  revalidatePath("/");
  revalidatePath("/products");
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const currentUser = await requireUser();
  const canManageInventory = hasRole(currentUser, ["SUPER_ADMIN"]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const searchQuery = resolvedSearchParams?.q?.trim() || "";
  const currentPage = Math.max(1, Number(resolvedSearchParams?.page) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;
  const where: Prisma.ProductWhereInput = searchQuery
    ? {
        OR: [
          {
            name: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            brand: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        brand: true,
        variants: {
          select: {
            size: true,
            color: true,
            stock: true,
            price: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,transparent_18%),radial-gradient(circle_at_top_right,#ffedd5_0%,transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Inventory Overview
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Te gjitha patikat
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
              >
                Home
              </Link>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
                <span className="font-semibold text-slate-950">
                  {totalProducts}
                </span>{" "}
                modele ne sistem
              </div>
              {canManageInventory ? (
                <Link
                  href="/products/new"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                >
                  + Shto Patike
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
            <ProductsFilters searchQuery={searchQuery} />
          </div>
          {products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-medium text-slate-900">
                {searchQuery
                  ? "Nuk u gjet asnje produkt me kete kerkim"
                  : "Nuk ka ende produkte te regjistruara"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {searchQuery
                  ? "Provo nje kerkese tjeter ose bej reset per t'i pare te gjitha."
                  : "Shto modelin e pare dhe vazhdo me variantet per te filluar inventarin."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 sm:p-5 lg:hidden">
                {products.map((product) => {
                  const sizes = [
                    ...new Set(product.variants.map((variant) => variant.size)),
                  ];
                  const colors = [
                    ...new Set(
                      product.variants.map((variant) => variant.color),
                    ),
                  ];
                  const totalStock = product.variants.reduce(
                    (sum, variant) => sum + variant.stock,
                    0,
                  );
                  const lowStockVariantsCount = product.variants.filter(
                    (variant) =>
                      variant.stock > 0 && variant.stock <= LOW_STOCK_THRESHOLD,
                  ).length;
                  const prices = product.variants.map((variant) =>
                    Number(variant.price),
                  );
                  const minPrice =
                    prices.length > 0 ? Math.min(...prices) : null;
                  const maxPrice =
                    prices.length > 0 ? Math.max(...prices) : null;

                  return (
                    <article
                      key={product.id}
                      className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-slate-950">
                            {product.name}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600">
                            {product.brand}
                          </p>
                        </div>
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {product.variants.length} var
                          {lowStockVariantsCount > 0
                            ? ` (${lowStockVariantsCount} low)`
                            : ""}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Stoku
                          </p>
                          <p className="mt-1 text-lg font-semibold text-emerald-700">
                            {totalStock}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Cmimi
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {minPrice === null
                              ? "-"
                              : minPrice === maxPrice
                                ? `${minPrice.toFixed(2)} EUR`
                                : `${minPrice.toFixed(2)} - ${maxPrice?.toFixed(2)} EUR`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Numrat
                          </p>
                          <p className="mt-1">
                            {sizes.length > 0 ? sizes.join(", ") : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Ngjyrat
                          </p>
                          <p className="mt-1">
                            {colors.length > 0 ? colors.join(", ") : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Menaxho
                        </Link>
                        {canManageInventory ? (
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            Edito
                          </Link>
                        ) : null}
                        {canManageInventory && product.variants.length === 0 ? (
                          <ConfirmActionForm
                            action={deleteProduct}
                            hiddenFields={[
                              { name: "productId", value: product.id },
                            ]}
                            confirmMessage="A je i sigurt qe don ta fshish kete produkt?"
                            buttonLabel="Fshi"
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          />
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/90 text-left">
                    <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-5 py-4">Modeli</th>
                      <th className="px-5 py-4">Brendi</th>
                      <th className="px-5 py-4">Numrat</th>
                      <th className="px-5 py-4">Ngjyrat</th>
                      <th className="px-5 py-4 text-center">Variante</th>
                      <th className="px-5 py-4 text-center">Stoku</th>
                      <th className="px-5 py-4 text-right">Cmimi</th>
                      <th className="px-5 py-4 text-right">Veprime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {products.map((product) => {
                      const sizes = [
                        ...new Set(
                          product.variants.map((variant) => variant.size),
                        ),
                      ];
                      const colors = [
                        ...new Set(
                          product.variants.map((variant) => variant.color),
                        ),
                      ];
                      const totalStock = product.variants.reduce(
                        (sum, variant) => sum + variant.stock,
                        0,
                      );
                      const lowStockVariantsCount = product.variants.filter(
                        (variant) =>
                          variant.stock > 0 &&
                          variant.stock <= LOW_STOCK_THRESHOLD,
                      ).length;
                      const prices = product.variants.map((variant) =>
                        Number(variant.price),
                      );
                      const minPrice =
                        prices.length > 0 ? Math.min(...prices) : null;
                      const maxPrice =
                        prices.length > 0 ? Math.max(...prices) : null;

                      return (
                        <tr
                          key={product.id}
                          className="align-top transition hover:bg-sky-50/40"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {product.name}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {product.brand}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {sizes.length > 0 ? sizes.join(", ") : "-"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {colors.length > 0 ? colors.join(", ") : "-"}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                              {product.variants.length}
                              {lowStockVariantsCount > 0
                                ? ` (${lowStockVariantsCount} low)`
                                : ""}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex min-w-14 items-center justify-center rounded-xl px-3 py-2 font-semibold ${
                                getStockTone(totalStock).badgeClassName
                              }`}
                            >
                              {totalStock}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                            {minPrice === null
                              ? "-"
                              : minPrice === maxPrice
                                ? `${minPrice.toFixed(2)} EUR`
                                : `${minPrice.toFixed(2)} - ${maxPrice?.toFixed(2)} EUR`}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/products/${product.id}`}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                              >
                                Menaxho
                              </Link>
                              {canManageInventory ? (
                                <Link
                                  href={`/products/${product.id}/edit`}
                                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                                >
                                  Edito
                                </Link>
                              ) : null}
                              {canManageInventory &&
                              product.variants.length === 0 ? (
                                <ConfirmActionForm
                                  action={deleteProduct}
                                  hiddenFields={[
                                    { name: "productId", value: product.id },
                                  ]}
                                  confirmMessage="A je i sigurt qe don ta fshish kete produkt?"
                                  buttonLabel="Fshi"
                                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {totalProducts > PAGE_SIZE ? (
          <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Faqja{" "}
              <span className="font-semibold text-slate-950">
                {currentPage}
              </span>{" "}
              nga{" "}
              <span className="font-semibold text-slate-950">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              {previousPage ? (
                <Link
                  href={buildProductsPageHref(previousPage, searchQuery)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Mbrapa
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                  Mbrapa
                </span>
              )}
              {nextPage ? (
                <Link
                  href={buildProductsPageHref(nextPage, searchQuery)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Para
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                  Para
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
