import Link from "next/link";
import { headers } from "next/headers";
import type { Prisma } from "@/app/generated/prisma/client";
import { AutoPrintOnMount } from "@/app/reports/auto-print-on-mount";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWarehouseStock } from "@/lib/stock-levels";

export const metadata = {
  title: "Printo listen e produkteve",
};

type ProductsExportPageProps = {
  searchParams?: Promise<{
    q?: string;
    brand?: string;
    model?: string;
    warehouse?: string;
    print?: string;
  }>;
};

type StockSheetRow = {
  brand: string;
  imageUrl: string | null;
  sizes: Array<{ size: string; stock: number }>;
};

function toAbsoluteImageUrl(origin: string, src: string | null) {
  if (!src) {
    return null;
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  if (src.startsWith("/")) {
    return `${origin}${src}`;
  }

  return `${origin}/${src}`;
}

function buildWhere({
  q,
  brand,
  model,
  warehouseId,
}: {
  q: string;
  brand: string;
  model: string;
  warehouseId: number | null;
}): Prisma.ProductWhereInput {
  const filters: Prisma.ProductWhereInput[] = [];
  const searchTokens = q
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (searchTokens.length > 0) {
    filters.push({
      AND: searchTokens.map((token) => ({
        OR: [
          { name: { contains: token, mode: "insensitive" } },
          { brand: { contains: token, mode: "insensitive" } },
          {
            variants: {
              some: {
                color: { contains: token, mode: "insensitive" },
              },
            },
          },
          {
            variants: {
              some: {
                size: { contains: token, mode: "insensitive" },
              },
            },
          },
          {
            variants: {
              some: {
                sku: { contains: token, mode: "insensitive" },
              },
            },
          },
        ],
      })),
    });
  }

  if (brand) {
    filters.push({
      brand: {
        equals: brand,
        mode: "insensitive",
      },
    });
  }

  if (model) {
    filters.push({
      name: {
        equals: model,
        mode: "insensitive",
      },
    });
  }

  if (warehouseId) {
    filters.push({
      variants: {
        some: {
          stockLevels: {
            some: {
              warehouseId,
              quantity: {
                gt: 0,
              },
            },
          },
        },
      },
    });
  } else {
    filters.push({
      variants: {
        some: {
          active: true,
          stock: {
            gt: 0,
          },
        },
      },
    });
  }

  return filters.length > 0 ? { AND: filters } : {};
}

function getOriginFromHeaders(headerStore: Headers) {
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";

  return `${protocol}://${host}`;
}

export default async function ProductsExportPage({
  searchParams,
}: ProductsExportPageProps) {
  await requireUser();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const q = resolvedSearchParams?.q?.trim() || "";
  const brand = resolvedSearchParams?.brand?.trim() || "";
  const model = resolvedSearchParams?.model?.trim() || "";
  const warehouse = resolvedSearchParams?.warehouse?.trim() || "";
  const isPrint = resolvedSearchParams?.print === "1";
  const warehouseId = Number(warehouse) || null;
  const headerStore = await headers();
  const origin = getOriginFromHeaders(headerStore);

  const where = buildWhere({ q, brand, model, warehouseId });

  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      select: {
        brand: true,
        variants: {
          where: { active: true },
          orderBy: [{ color: "asc" }, { size: "asc" }],
          select: {
            color: true,
            size: true,
            imagePath: true,
            stock: true,
            ...(warehouseId
              ? {
                  stockLevels: {
                    where: { warehouseId },
                    select: {
                      warehouseId: true,
                      quantity: true,
                    },
                  },
                }
              : {}),
          },
        },
      },
    }),
    prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: StockSheetRow[] = products.flatMap((product) => {
    const grouped = new Map<
      string,
      { imagePath: string | null; sizes: Array<{ size: string; stock: number }> }
    >();

    for (const variant of product.variants) {
      const variantStock = resolveWarehouseStock(
        Array.isArray(variant.stockLevels) ? variant.stockLevels : undefined,
        variant.stock,
        warehouseId,
      );

      if (variantStock <= 0) {
        continue;
      }

      const key = variant.color.trim().toLowerCase();
      const current = grouped.get(key);

      if (current) {
        if (!current.imagePath && variant.imagePath) {
          current.imagePath = variant.imagePath;
        }
        current.sizes.push({
          size: variant.size,
          stock: variantStock,
        });
      } else {
        grouped.set(key, {
          imagePath: variant.imagePath,
          sizes: [
            {
              size: variant.size,
              stock: variantStock,
            },
          ],
        });
      }
    }

    return [...grouped.values()].map((item) => ({
      brand: product.brand,
      imageUrl: toAbsoluteImageUrl(origin, item.imagePath),
      sizes: item.sizes.sort((a, b) =>
        a.size.localeCompare(b.size, "sq", {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    }));
  });

  const warehouseLabel = warehouseId
    ? warehouses.find((item) => item.id === warehouseId)?.name ?? "Depo e zgjedhur"
    : "Te gjitha depot";

  const generatedAt = new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const printHref = (() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (warehouse) params.set("warehouse", warehouse);
    params.set("print", "1");
    return `/products/export?${params.toString()}`;
  })();

  const htmlHref = (() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (warehouse) params.set("warehouse", warehouse);
    return params.toString()
      ? `/products/export/html?${params.toString()}`
      : "/products/export/html";
  })();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 print:bg-white print:px-0 print:py-0 sm:px-6 lg:px-8">
      {isPrint ? <AutoPrintOnMount /> : null}

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[26px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] print:rounded-none print:border-none print:px-0 print:py-0 print:shadow-none sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img
                  src={toAbsoluteImageUrl(origin, "/logo.jpg") ?? "/logo.jpg"}
                  alt="ShkelShoes"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight text-slate-950">
                  ShkelShoes
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Depoja: {warehouseLabel} · Gjeneruar: {generatedAt}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Link
                href="/products"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Mbyll
              </Link>
              <Link
                href={htmlHref}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Download HTML
              </Link>
            </div>
          </div>
        </section>

        {rows.length > 0 ? (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
            {rows.map((row, index) => (
              <article
                key={`${row.brand}-${row.imageUrl ?? "no-image"}-${index}`}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] print:break-inside-avoid print:shadow-none"
              >
                <div className="bg-slate-200">
                  {row.imageUrl ? (
                    <img
                      src={row.imageUrl}
                      alt={row.brand}
                      className="h-[280px] w-full object-cover sm:h-[320px]"
                    />
                  ) : (
                    <div className="flex h-[280px] w-full items-center justify-center bg-slate-50 text-xs font-semibold tracking-[0.2em] text-slate-400 sm:h-[320px]">
                      PA FOTO
                    </div>
                  )}
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Brandi
                      </div>
                      <div className="text-[32px] font-extrabold leading-none tracking-tight text-slate-950">
                        {row.brand}
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                      {row.sizes.reduce((sum, item) => sum + item.stock, 0)} gjithsej
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {row.sizes.map((item) => (
                      <div
                        key={`${row.brand}-${item.size}`}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <span className="text-[15px] font-bold text-slate-950">
                          Nr {item.size}
                        </span>
                        <span className="text-[20px] font-extrabold text-emerald-700">
                          {item.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500 shadow-sm">
            Nuk ka te dhena per kete eksport.
          </section>
        )}
      </div>
    </main>
  );
}
